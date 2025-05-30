-- AddDefaultPasswordColumnToSecuritySettings
ALTER TABLE `security_settings` ADD COLUMN `default_password` VARCHAR(255) NULL DEFAULT 'P@ssw0rd2025';
