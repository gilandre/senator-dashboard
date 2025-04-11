-- Création de la table buttons
CREATE TABLE IF NOT EXISTS `buttons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NULL,
  `action` VARCHAR(255) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `menu_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_menu_id` (`menu_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de relation entre buttons et permissions
CREATE TABLE IF NOT EXISTS `button_permissions` (
  `button_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`button_id`, `permission_id`),
  INDEX `idx_button_id` (`button_id`),
  INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 