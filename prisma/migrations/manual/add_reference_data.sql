-- Création de la table reference_data
CREATE TABLE IF NOT EXISTS `reference_data` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `type` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `feature` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `color_code` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `icon_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `type_code_module` (`type`, `code`, `module`),
  INDEX `idx_ref_type` (`type`),
  INDEX `idx_ref_module` (`module`),
  INDEX `idx_ref_type_module` (`type`, `module`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Vérifier si la colonne status_id existe déjà dans la table users
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_id';

-- Ajout de la colonne status_id à la table users si elle n'existe pas déjà
SET @sql = IF(@columnExists = 0, 'ALTER TABLE `users` ADD COLUMN `status_id` INT NULL', 'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vérifier si l'index users_status_id_fkey existe déjà
SET @indexExists = 0;
SELECT COUNT(*) INTO @indexExists FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_status_id_fkey';

-- Ajout de l'index si nécessaire
SET @sqlIndex = IF(@indexExists = 0, 'ALTER TABLE `users` ADD INDEX `users_status_id_fkey` (`status_id`)', 'SELECT "Index already exists"');
PREPARE stmtIndex FROM @sqlIndex;
EXECUTE stmtIndex;
DEALLOCATE PREPARE stmtIndex;

-- Vérifier si la contrainte de clé étrangère users_status_id_fkey existe déjà
SET @fkExists = 0;
SELECT COUNT(*) INTO @fkExists FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_id' 
AND CONSTRAINT_NAME = 'users_status_id_fkey' AND REFERENCED_TABLE_NAME = 'reference_data';

-- Ajout de la contrainte de clé étrangère pour status_id si nécessaire
SET @sqlFK = IF(@fkExists = 0, 'ALTER TABLE `users` ADD CONSTRAINT `users_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `reference_data` (`id`) ON DELETE SET NULL', 'SELECT "Foreign key already exists"');
PREPARE stmtFK FROM @sqlFK;
EXECUTE stmtFK;
DEALLOCATE PREPARE stmtFK;

-- Insertion des données de référence pour les statuts utilisateurs
INSERT INTO `reference_data` (`code`, `value`, `display_name`, `description`, `type`, `module`, `feature`, `is_active`, `sort_order`, `color_code`, `icon_name`) 
VALUES 
('active', 'active', 'Actif', 'Utilisateur actif pouvant se connecter', 'status', 'users', 'user_management', TRUE, 1, 'bg-green-100 text-green-800', 'CheckCircle'),
('inactive', 'inactive', 'Inactif', 'Utilisateur désactivé ne pouvant pas se connecter', 'status', 'users', 'user_management', TRUE, 2, 'bg-gray-100 text-gray-800', 'XCircle'),
('suspended', 'suspended', 'Suspendu', 'Utilisateur temporairement suspendu', 'status', 'users', 'user_management', TRUE, 3, 'bg-amber-100 text-amber-800', 'UserCheck')
ON DUPLICATE KEY UPDATE 
`value` = VALUES(`value`), 
`display_name` = VALUES(`display_name`), 
`description` = VALUES(`description`),
`is_active` = VALUES(`is_active`),
`sort_order` = VALUES(`sort_order`),
`color_code` = VALUES(`color_code`),
`icon_name` = VALUES(`icon_name`);

-- Insertion des données de référence pour les rôles utilisateurs
INSERT INTO `reference_data` (`code`, `value`, `display_name`, `description`, `type`, `module`, `feature`, `is_active`, `sort_order`, `color_code`) 
VALUES 
('admin', 'admin', 'Administrateur', 'Accès complet à toutes les fonctionnalités', 'role', 'users', 'user_management', TRUE, 1, 'bg-blue-100 text-blue-800'),
('operator', 'operator', 'Opérateur', 'Accès à la plupart des fonctionnalités opérationnelles', 'role', 'users', 'user_management', TRUE, 2, 'bg-green-100 text-green-800'),
('viewer', 'viewer', 'Observateur', 'Accès en lecture seule', 'role', 'users', 'user_management', TRUE, 3, 'bg-purple-100 text-purple-800'),
('user', 'user', 'Utilisateur', 'Accès standard aux fonctionnalités de base', 'role', 'users', 'user_management', TRUE, 4, 'bg-slate-100')
ON DUPLICATE KEY UPDATE 
`value` = VALUES(`value`), 
`display_name` = VALUES(`display_name`), 
`description` = VALUES(`description`),
`is_active` = VALUES(`is_active`),
`sort_order` = VALUES(`sort_order`),
`color_code` = VALUES(`color_code`);

-- Mise à jour des utilisateurs pour définir leur status_id en fonction de leur status existant
UPDATE `users` u
JOIN `reference_data` rd ON rd.`code` = CONVERT(u.`status` USING utf8mb4) COLLATE utf8mb4_unicode_ci 
  AND rd.`type` = 'status' AND rd.`module` = 'users'
SET u.`status_id` = rd.`id`
WHERE u.`status_id` IS NULL; 