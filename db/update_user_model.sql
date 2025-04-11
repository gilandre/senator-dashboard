-- Ajouter les colonnes manquantes à la table users pour correspondre au modèle User.php
-- Vérifier si les colonnes existent déjà avant de les ajouter
SET @sql = (SELECT IF(
    EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'senator_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'failed_attempts'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0 AFTER login_attempts'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modifier les colonnes existantes pour avoir le bon type
ALTER TABLE users 
    MODIFY COLUMN login_attempts INT NOT NULL DEFAULT 0,
    MODIFY COLUMN last_attempt DATETIME NULL DEFAULT NULL,
    MODIFY COLUMN password_reset_token VARCHAR(255) NULL DEFAULT NULL,
    MODIFY COLUMN password_reset_expires DATETIME NULL DEFAULT NULL;

-- Vérifier si la colonne password_changed_at existe déjà
SET @sql = (SELECT IF(
    EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'senator_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL DEFAULT NULL'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mise à jour des noms de colonnes pour correspondre aux propriétés du modèle
-- Vérifier si les colonnes doivent être renommées
SET @sql = (SELECT IF(
    EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'senator_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_attempt'),
    'ALTER TABLE users RENAME COLUMN last_attempt TO last_failed_attempt',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'senator_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_token'),
    'ALTER TABLE users RENAME COLUMN password_reset_token TO reset_token',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'senator_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_expires'),
    'ALTER TABLE users RENAME COLUMN password_reset_expires TO reset_token_expires_at',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 