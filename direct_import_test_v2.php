<?php
// Direct import test script v2 - Handling multiline fields

// Path to the CSV file
$csvFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/Exportation 1.csv';
$logFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/direct_import_log_v2.txt';

// Log function
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

logMessage("Starting direct import test v2 with file: $csvFile");

// Check if file exists
if (!file_exists($csvFile)) {
    logMessage("ERROR: File not found: $csvFile");
    echo "File not found";
    exit(1);
}

// Read the file contents and manually parse it
$fileContent = file_get_contents($csvFile);
logMessage("File loaded, size: " . strlen($fileContent) . " bytes");

// Check for and remove BOM if present
if (substr($fileContent, 0, 3) === "\xEF\xBB\xBF") {
    $fileContent = substr($fileContent, 3);
    logMessage("BOM detected and removed");
}

// Process the file manually to handle the multiline issue
// First, normalize line endings
$fileContent = str_replace(["\r\n", "\r"], "\n", $fileContent);
logMessage("Line endings normalized");

// Split into lines
$lines = explode("\n", $fileContent);
logMessage("File split into " . count($lines) . " raw lines");

// First line is the header
$headerLine = array_shift($lines);
$header = explode(';', $headerLine);
logMessage("Header line: " . $headerLine);
logMessage("Detected " . count($header) . " columns in header: " . implode(", ", $header));

// Process data rows
$rows = [];
$currentRow = [];
$rowNum = 0;
$badgeNumberIndex = array_search('Numéro de badge', $header);
$dateIndex = array_search('Date évènements', $header);

if ($badgeNumberIndex === false) {
    logMessage("ERROR: 'Numéro de badge' column not found in header");
    exit(1);
}

if ($dateIndex === false) {
    logMessage("ERROR: 'Date évènements' column not found in header");
    exit(1);
}

logMessage("Badge number column index: $badgeNumberIndex");
logMessage("Date column index: $dateIndex");

// Process raw lines to rebuild proper rows
$currentRowData = [];
$inMultilineRow = false;
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
            logMessage("Found continuation line for row $rowNum: $line");
            
            // Append data to the appropriate column in the pending row
            // This is a heuristic approach - you may need to adjust based on your data
            // Typically, the last column of the previous row might be incomplete
            if (count($values) > 0 && !empty($values[0])) {
                // Append to the last non-empty column of the pending row
                $lastNonEmptyIndex = count($pendingRow) - 1;
                while ($lastNonEmptyIndex >= 0 && empty($pendingRow[$lastNonEmptyIndex])) {
                    $lastNonEmptyIndex--;
                }
                
                if ($lastNonEmptyIndex >= 0) {
                    $pendingRow[$lastNonEmptyIndex] .= ' ' . $values[0];
                    logMessage("Appended value to column $lastNonEmptyIndex");
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
$associativeRows = [];
foreach ($rows as $i => $row) {
    if (count($row) >= count($header)) {
        $associativeRow = [];
        foreach ($header as $j => $colName) {
            $associativeRow[$colName] = $row[$j] ?? '';
        }
        $associativeRows[] = $associativeRow;
    } else {
        logMessage("WARNING: Row $i has " . count($row) . " columns, expected " . count($header));
    }
}

logMessage("Converted " . count($associativeRows) . " rows to associative arrays");

// Process the dates
logMessage("Processing rows to fix dates");
$fixedCount = 0;
$futureCount = 0;

foreach ($associativeRows as $index => $row) {
    // Limit processing to max 10 rows for clarity
    if ($index >= 10) {
        logMessage("Processed first 10 rows, stopping for log clarity");
        break;
    }
    
    $badgeNumber = $row['Numéro de badge'] ?? 'unknown';
    $dateStr = $row['Date évènements'] ?? 'now';
    
    logMessage("Row $index - Badge: $badgeNumber, Original date: $dateStr");
    
    // Traiter le format avec date et heure "jj/mm/aaaa hh:mm:ss"
    if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+/', $dateStr, $matches)) {
        // Extraire uniquement la partie date
        $jour = $matches[1];
        $mois = $matches[2];
        $annee = $matches[3];
        
        logMessage("Format jj/mm/aaaa hh:mm:ss detected: day=$jour, month=$mois, year=$annee");
        
        // Corriger l'année si elle est dans le futur
        $anneeActuelle = (int)date('Y');
        if ((int)$annee > $anneeActuelle) {
            logMessage("Future year detected: $annee > $anneeActuelle, applying correction");
            $annee = $anneeActuelle;
            $futureCount++;
        }
        
        // Reconstruire la date au format MySQL
        $fixedDate = sprintf('%04d-%02d-%02d', $annee, $mois, $jour);
        logMessage("Converted date: $fixedDate");
        $fixedCount++;
    }
    // Traiter le format simple "jj/mm/aaaa"
    else if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $dateStr, $matches)) {
        $jour = $matches[1];
        $mois = $matches[2];
        $annee = $matches[3];
        
        logMessage("Format jj/mm/aaaa detected: day=$jour, month=$mois, year=$annee");
        
        // Corriger l'année si elle est dans le futur
        $anneeActuelle = (int)date('Y');
        if ((int)$annee > $anneeActuelle) {
            logMessage("Future year detected: $annee > $anneeActuelle, applying correction");
            $annee = $anneeActuelle;
            $futureCount++;
        }
        
        // Reconstruire la date au format MySQL
        $fixedDate = sprintf('%04d-%02d-%02d', $annee, $mois, $jour);
        logMessage("Converted date: $fixedDate");
        $fixedCount++;
    } else {
        logMessage("Unrecognized date format: $dateStr");
    }
}

// Look for records with badge 563
$badge563Records = [];
foreach ($associativeRows as $index => $row) {
    if (isset($row['Numéro de badge']) && $row['Numéro de badge'] == '563') {
        $badge563Records[] = $row;
    }
}

logMessage("Found " . count($badge563Records) . " records with badge number 563");
if (count($badge563Records) > 0) {
    logMessage("First badge 563 record: " . print_r($badge563Records[0], true));
}

logMessage("Date processing complete. Fixed $fixedCount dates, corrected $futureCount future dates.");
logMessage("Test completed successfully.");

echo "Test completed. See log file for details: $logFile"; 