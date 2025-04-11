-- Création de la table menus
CREATE TABLE IF NOT EXISTS `menus` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NULL,
  `route` VARCHAR(255) NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `parent_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de relation entre menus et permissions
CREATE TABLE IF NOT EXISTS `menu_permissions` (
  `menu_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`menu_id`, `permission_id`),
  INDEX `idx_menu_id` (`menu_id`),
  INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 