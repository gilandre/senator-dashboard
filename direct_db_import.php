<?php
// Direct database import script
// This script bypasses the web interface and directly inserts records into the database

// Configuration
$csvFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/Exportation 1.csv';
$logFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/direct_db_import_log.txt';
$dbConfig = [
    'host' => 'localhost',
    'user' => 'root',
    'password' => '',
    'database' => 'senator_db'
];

// Log function
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    echo $logMessage; // Also output to console
}

logMessage("Starting direct database import with file: $csvFile");

// Check if file exists
if (!file_exists($csvFile)) {
    logMessage("ERROR: File not found: $csvFile");
    exit(1);
}

// Connect to database
try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4", 
        $dbConfig['user'], 
        $dbConfig['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    logMessage("Successfully connected to database");
} catch (PDOException $e) {
    logMessage("ERROR: Database connection failed: " . $e->getMessage());
    exit(1);
}

// Read and parse CSV file
try {
    // Read the file contents
    $fileContent = file_get_contents($csvFile);
    logMessage("File loaded, size: " . strlen($fileContent) . " bytes");
    
    // Check for and remove BOM if present
    if (substr($fileContent, 0, 3) === "\xEF\xBB\xBF") {
        $fileContent = substr($fileContent, 3);
        logMessage("BOM detected and removed");
    }
    
    // Process the file to handle multiline issues
    // First, normalize line endings
    $fileContent = str_replace(["\r\n", "\r"], "\n", $fileContent);
    
    // Split into lines
    $lines = explode("\n", $fileContent);
    logMessage("File split into " . count($lines) . " raw lines");
    
    // First line is the header
    $headerLine = array_shift($lines);
    $header = explode(';', $headerLine);
    logMessage("Detected " . count($header) . " columns in header");
    
    // Process data rows
    $rows = [];
    $rowNum = 0;
    $badgeNumberIndex = array_search('Numéro de badge', $header);
    
    if ($badgeNumberIndex === false) {
        logMessage("ERROR: 'Numéro de badge' column not found in header");
        exit(1);
    }
    
    // Process raw lines to rebuild proper rows
    $fixedRows = 0;
    $pendingRow = [];
    
    foreach ($lines as $i => $line) {
        $values = explode(';', $line);
        
        // Check if this looks like the start of a new row (has a badge number)
        $isBadgeNumberValid = isset($values[$badgeNumberIndex]) && preg_match('/^\d+$/', trim($values[$badgeNumberIndex]));
        
        if ($isBadgeNumberValid) {
            // Store the previous row if we have one
            if (!empty($pendingRow)) {
                $rows[] = $pendingRow;
                $rowNum++;
            }
            
            // Start a new row
            $pendingRow = array_pad([], count($header), ''); // Initialize with empty values
            
            // Copy values from this line
            foreach ($values as $j => $value) {
                if ($j < count($header)) {
                    $pendingRow[$j] = trim($value);
                }
            }
        } else {
            // This is a continuation of the previous row
            if (!empty($pendingRow)) {
                $fixedRows++;
                
                // Append data to the appropriate column in the pending row
                // This is a heuristic approach - you may need to adjust based on your data
                if (count($values) > 0 && !empty($values[0])) {
                    // Append to the last non-empty column of the pending row
                    $lastNonEmptyIndex = count($pendingRow) - 1;
                    while ($lastNonEmptyIndex >= 0 && empty($pendingRow[$lastNonEmptyIndex])) {
                        $lastNonEmptyIndex--;
                    }
                    
                    if ($lastNonEmptyIndex >= 0) {
                        $pendingRow[$lastNonEmptyIndex] .= ' ' . $values[0];
                    }
                }
                
                // Add any additional values to subsequent columns
                for ($j = 1; $j < count($values); $j++) {
                    $targetIndex = $lastNonEmptyIndex + $j;
                    if ($targetIndex < count($header) && !empty($values[$j])) {
                        if (empty($pendingRow[$targetIndex])) {
                            $pendingRow[$targetIndex] = $values[$j];
                        } else {
                            $pendingRow[$targetIndex] .= ' ' . $values[$j];
                        }
                    }
                }
            }
        }
    }
    
    // Add the last pending row
    if (!empty($pendingRow)) {
        $rows[] = $pendingRow;
        $rowNum++;
    }
    
    logMessage("Successfully processed $rowNum rows, fixed $fixedRows lines with multiline issues");
    
    // Convert numeric arrays to associative using header
    $records = [];
    foreach ($rows as $i => $row) {
        if (count($row) >= count($header)) {
            $record = [];
            foreach ($header as $j => $colName) {
                $record[$colName] = $row[$j] ?? '';
            }
            $records[] = $record;
        } else {
            logMessage("WARNING: Row $i has " . count($row) . " columns, expected " . count($header));
        }
    }
    
    logMessage("Converted " . count($records) . " rows to associative arrays");
    
    // Start database transaction
    $pdo->beginTransaction();
    logMessage("Started database transaction");
    
    // Prepare SQL statement
    $sql = "INSERT INTO access_logs (
        badge_number, event_date, event_time, central,
        event_type, last_name, first_name, 
        status, group_name, created_at
    ) VALUES (
        :badge_number, :event_date, :event_time, :central,
        :event_type, :last_name, :first_name,
        :status, :group_name, NOW()
    )";
    
    $stmt = $pdo->prepare($sql);
    
    $insertCount = 0;
    $errorCount = 0;
    $skipCount = 0;
    $badge563Count = 0;
    $duplicateRows = [];
    
    // Process records and insert into database
    foreach ($records as $index => $record) {
        // Skip first 5 records for testing (to avoid processing the entire file)
        if ($index > 20) {
            logMessage("Stopping after 20 records for testing");
            break;
        }
        
        $badgeNumber = $record['Numéro de badge'] ?? '';
        if (empty($badgeNumber)) {
            $errorCount++;
            logMessage("ERROR: Row $index missing badge number");
            continue;
        }
        
        // Process badge 563 specifically
        if ($badgeNumber == '563') {
            $badge563Count++;
            logMessage("Processing badge 563 record #$badge563Count: " . json_encode($record));
        }
        
        // Parse date
        $dateStr = $record['Date évènements'] ?? '';
        if (empty($dateStr)) {
            $errorCount++;
            logMessage("ERROR: Row $index missing event date");
            continue;
        }
        
        // Process date format (dd/mm/yyyy hh:mm:ss)
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+/', $dateStr, $matches)) {
            $day = $matches[1];
            $month = $matches[2];
            $year = $matches[3];
            
            // Fix future dates
            $currentYear = (int)date('Y');
            if ((int)$year > $currentYear) {
                logMessage("Fixing future year: $year -> $currentYear");
                $year = $currentYear;
            }
            
            $eventDate = sprintf('%04d-%02d-%02d', $year, $month, $day);
        } 
        // Process date format (dd/mm/yyyy)
        else if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $dateStr, $matches)) {
            $day = $matches[1];
            $month = $matches[2];
            $year = $matches[3];
            
            // Fix future dates
            $currentYear = (int)date('Y');
            if ((int)$year > $currentYear) {
                logMessage("Fixing future year: $year -> $currentYear");
                $year = $currentYear;
            }
            
            $eventDate = sprintf('%04d-%02d-%02d', $year, $month, $day);
        } else {
            $errorCount++;
            logMessage("ERROR: Row $index has invalid date format: $dateStr");
            continue;
        }
        
        // Check for duplicate records
        $checkSql = "SELECT COUNT(*) as count FROM access_logs 
                     WHERE badge_number = :badge_number 
                     AND event_date = :event_date 
                     AND event_time = :event_time";
        
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([
            ':badge_number' => $badgeNumber,
            ':event_date' => $eventDate,
            ':event_time' => $record['Heure évènements'] ?? '00:00:00'
        ]);
        
        $result = $checkStmt->fetch();
        if ($result['count'] > 0) {
            logMessage("Skipping duplicate record for badge $badgeNumber on " . date('Y-m-d', strtotime($eventDate)));
            
            // Store this duplicate record for later
            $duplicateRows[] = $record;
            
            $skipCount++;
            continue;
        }
        
        // Insert record
        try {
            $stmt->execute([
                ':badge_number' => $badgeNumber,
                ':event_date' => $eventDate,
                ':event_time' => $record['Heure évènements'] ?? '00:00:00',
                ':central' => $record['Centrale'] ?? '',
                ':event_type' => $record['Nature Evenement'] ?? '',
                ':last_name' => $record['Nom'] ?? '',
                ':first_name' => $record['Prénom'] ?? '',
                ':status' => $record['Statut'] ?? '',
                ':group_name' => $record['Groupe'] ?? ''
            ]);
            
            $insertCount++;
            logMessage("Inserted record for badge $badgeNumber on $eventDate");
        } catch (PDOException $e) {
            $errorCount++;
            logMessage("ERROR inserting row $index: " . $e->getMessage());
        }
    }
    
    // Commit transaction
    if ($errorCount == 0) {
        $pdo->commit();
        logMessage("Successfully committed transaction");
    } else {
        $pdo->rollBack();
        logMessage("Rolling back transaction due to errors");
    }
    
    logMessage("Import completed: $insertCount records inserted, $skipCount duplicates skipped, $errorCount errors, $badge563Count badge 563 records processed");

    // Log to import history table
    try {
        // Calculate success rate
        $totalRecords = $insertCount + $skipCount + $errorCount;
        $successRate = $totalRecords > 0 ? ($insertCount / $totalRecords) * 100 : 0;
        
        $sql = "INSERT INTO import_history (
            filename, import_date, user_id, username, 
            total_records, imported_records, duplicate_records, 
            error_records, success_rate
        ) VALUES (
            ?, NOW(), ?, ?, ?, ?, ?, ?, ?
        )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            basename($csvFile),
            null, // No user ID for direct import
            'Direct Import', // Username for tracking
            $totalRecords,
            $insertCount,
            $skipCount,
            $errorCount,
            $successRate
        ]);
        
        // Get the last insert ID
        $importHistoryId = $pdo->lastInsertId();
        
        logMessage("Import history recorded with ID: $importHistoryId");
        
        // Save duplicates to the import_duplicates table if there are any
        if ($skipCount > 0 && $importHistoryId) {
            logMessage("Recording duplicate records to import_duplicates table");
            
            try {
                // For each duplicate record we've stored
                foreach ($duplicateRows as $duplicateRow) {
                    $badge = $duplicateRow['Numéro de badge'] ?? '';
                    $eventDateStr = $duplicateRow['Date évènements'] ?? '';
                    
                    // Skip if required fields are missing
                    if (empty($badge) || empty($eventDateStr)) {
                        continue;
                    }
                    
                    // Format the date for the database
                    $eventDate = null;
                    if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})/', $eventDateStr, $matches)) {
                        $eventDate = $matches[3] . '-' . $matches[2] . '-' . $matches[1];
                    } else {
                        $eventDate = date('Y-m-d');
                    }
                    
                    // Convert row to JSON for storage
                    $rowData = json_encode([
                        'badge_number' => $badge,
                        'event_date' => $eventDateStr,
                        'event_time' => $duplicateRow['Heure évènements'] ?? '',
                        'central' => $duplicateRow['Centrale'] ?? '',
                        'event_type' => $duplicateRow['Nature Evenement'] ?? '',
                        'last_name' => $duplicateRow['Nom'] ?? '',
                        'first_name' => $duplicateRow['Prénom'] ?? '',
                        'status' => $duplicateRow['Statut'] ?? '',
                        'group_name' => $duplicateRow['Groupe'] ?? ''
                    ]);
                    
                    // Insert into import_duplicates table
                    $sql = "INSERT INTO import_duplicates (
                        import_id, badge_number, event_date, row_data
                    ) VALUES (?, ?, ?, ?)";
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $importHistoryId,
                        $badge,
                        $eventDate,
                        $rowData
                    ]);
                }
                
                logMessage("Recorded " . count($duplicateRows) . " duplicate records");
            } catch (Exception $e) {
                logMessage("Error recording duplicates: " . $e->getMessage());
            }
        }

    } catch (Exception $e) {
        logMessage("Error recording import history: " . $e->getMessage());
    }

} catch (Exception $e) {
    // Rollback transaction in case of error
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
        logMessage("Transaction rolled back due to error");
    }
    
    logMessage("ERROR: " . $e->getMessage());
    logMessage("Stack trace: " . $e->getTraceAsString());
}

logMessage("Script completed"); 