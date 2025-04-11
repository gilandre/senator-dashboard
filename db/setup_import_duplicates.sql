-- Création de la table import_duplicates
CREATE TABLE IF NOT EXISTS `import_duplicates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `import_id` INT NOT NULL,
  `badge_number` VARCHAR(50) NOT NULL,
  `event_date` DATE NOT NULL,
  `row_data` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_import_id` (`import_id`),
  INDEX `idx_badge_number` (`badge_number`),
  INDEX `idx_event_date` (`event_date`),
  CONSTRAINT `fk_import_duplicates_import_history` 
    FOREIGN KEY (`import_id`) REFERENCES `import_history` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 