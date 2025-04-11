<?php
try {
    // First try to connect without specifying a database
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', '');
    echo "Successfully connected to MySQL server\n";
    
    // Check if database exists
    $stmt = $pdo->query("SHOW DATABASES LIKE 'senator_db'");
    $exists = $stmt->fetchColumn();
    
    if (!$exists) {
        echo "Creating database 'senator_db'...\n";
        $pdo->exec("CREATE DATABASE senator_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "Database 'senator_db' created successfully\n";
    } else {
        echo "Database 'senator_db' already exists\n";
    }
    
    // Create tables in senator_db
    echo "Setting up tables in senator_db...\n";
    $pdo->exec("USE senator_db");

    // Create import_history table
    $pdo->exec("CREATE TABLE IF NOT EXISTS import_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        import_date DATETIME NOT NULL,
        user_id INT,
        username VARCHAR(100),
        total_records INT DEFAULT 0,
        imported_records INT DEFAULT 0,
        duplicate_records INT DEFAULT 0,
        error_records INT DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Create import_duplicates table
    $pdo->exec("CREATE TABLE IF NOT EXISTS import_duplicates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        import_id INT NOT NULL,
        badge_number VARCHAR(100) NOT NULL,
        event_date VARCHAR(100) NOT NULL,
        row_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (import_id),
        INDEX (badge_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Create import_row_hashes table
    $pdo->exec("CREATE TABLE IF NOT EXISTS import_row_hashes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        import_id INT NOT NULL,
        row_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (import_id),
        INDEX (row_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "All tables created/verified successfully\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
} 