<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Initialize database connection
$db = new Database([
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'dbname' => $_ENV['DB_NAME'] ?? 'senator_db',
    'username' => $_ENV['DB_USER'] ?? 'root',
    'password' => $_ENV['DB_PASS'] ?? '',
    'charset' => 'utf8mb4'
]);

// Path to the CSV file
$csvFile = __DIR__ . '/../Exportation 12.csv';

// Check if the file exists
if (!file_exists($csvFile)) {
    die("CSV file not found: $csvFile");
}

// Open the CSV file
$handle = fopen($csvFile, 'r');

// Skip the header row
fgetcsv($handle, 0, ';', '"', '\\');

// Counter for imported records
$imported = 0;
$errors = 0;

// Begin transaction
$db->beginTransaction();

try {
    // SQL statement for inserting records
    $sql = "
        INSERT INTO access_logs (
            badge_number, first_name, last_name, group_name, status, 
            event_date, event_time, event_type, central
        ) VALUES (
            :badge_number, :first_name, :last_name, :group_name, :status, 
            :event_date, :event_time, :event_type, :central
        )
    ";

    // Read the CSV file line by line
    while (($data = fgetcsv($handle, 0, ';', '"', '\\')) !== false) {
        // Skip empty lines
        if (count($data) < 12) {
            continue;
        }

        // Extract data from CSV
        $badgeNumber = $data[0];
        $eventDateTime = $data[1];
        $eventTime = $data[2];
        $central = $data[3];
        $reader = $data[4];
        $eventType = $data[5];
        $lastName = $data[6];
        $firstName = $data[7];
        $status = $data[8];
        $group = $data[9];
        $validityStartDate = $data[10];
        $creationDate = $data[11];

        // Parse the date and time
        $eventDateParts = explode(' ', $eventDateTime);
        $eventDate = $eventDateParts[0];
        
        // Convert date format from DD/MM/YYYY to YYYY-MM-DD
        $dateParts = explode('/', $eventDate);
        if (count($dateParts) === 3) {
            $eventDate = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];
        }

        // Execute the query with parameters
        $db->query($sql, [
            'badge_number' => $badgeNumber,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'group_name' => $group,
            'status' => $status,
            'event_date' => $eventDate,
            'event_time' => $eventTime,
            'event_type' => $eventType,
            'central' => $central
        ]);

        $imported++;
    }

    // Commit the transaction
    $db->commit();
    
    echo "Import completed successfully. Imported $imported records.";
} catch (Exception $e) {
    // Rollback the transaction in case of error
    $db->rollBack();
    echo "Error during import: " . $e->getMessage();
}

// Close the file
fclose($handle); 