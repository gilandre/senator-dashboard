-- Création de la table import_history
CREATE TABLE IF NOT EXISTS `import_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL,
  `import_date` DATETIME NOT NULL,
  `user_id` INT DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `total_records` INT NOT NULL DEFAULT 0,
  `imported_records` INT NOT NULL DEFAULT 0,
  `duplicate_records` INT NOT NULL DEFAULT 0,
  `error_records` INT NOT NULL DEFAULT 0,
  `success_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_import_date` (`import_date`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 