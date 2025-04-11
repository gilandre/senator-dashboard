<?php
// Direct import test script

// Path to the CSV file
$csvFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/Exportation 1.csv';
$logFile = '/Users/quantinnumea/Documents/SENATOR_INVESTECH/direct_import_log.txt';

// Log function
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

logMessage("Starting direct import test with file: $csvFile");

// Check if file exists
if (!file_exists($csvFile)) {
    logMessage("ERROR: File not found: $csvFile");
    echo "File not found";
    exit(1);
}

// Read CSV file
$rows = [];
$handle = fopen($csvFile, 'r');
if ($handle !== false) {
    // Read header
    $header = fgetcsv($handle, 0, ';', '"', '\\');
    logMessage("CSV Header: " . implode(', ', $header));

    // Read rows
    $rowCount = 0;
    while (($data = fgetcsv($handle, 0, ';', '"', '\\')) !== false) {
        $rowCount++;
        if (count($data) != count($header)) {
            logMessage("WARNING: Row $rowCount has " . count($data) . " columns, expected " . count($header));
            continue;
        }
        
        $row = array_combine($header, $data);
        $rows[] = $row;
        
        // Log every 100 rows
        if ($rowCount % 100 === 0) {
            logMessage("Read $rowCount rows so far");
        }
    }
    fclose($handle);
    logMessage("Total rows read: $rowCount");
} else {
    logMessage("ERROR: Could not open file for reading");
    echo "Could not open file";
    exit(1);
}

// Process rows
logMessage("Processing rows to fix dates");
$fixedCount = 0;
$futureCount = 0;

foreach ($rows as $index => $row) {
    // If we've processed 10 rows, break to keep the log manageable
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

logMessage("Date processing complete. Fixed $fixedCount dates, corrected $futureCount future dates.");
logMessage("Test completed successfully.");

echo "Test completed. See log file for details: $logFile"; 