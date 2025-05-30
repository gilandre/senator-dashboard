-- CreateTable
CREATE TABLE `ui_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NULL,
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'string',
  `scope` VARCHAR(50) NOT NULL DEFAULT 'global',
  `module` VARCHAR(100) NULL,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_setting`(`user_id`, `key`, `scope`, `module`),
  INDEX `idx_key`(`key`),
  INDEX `idx_user_id`(`user_id`),
  INDEX `idx_scope`(`scope`),
  INDEX `idx_module`(`module`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ui_settings` ADD CONSTRAINT `ui_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; 