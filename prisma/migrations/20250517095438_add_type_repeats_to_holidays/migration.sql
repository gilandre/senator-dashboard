-- AlterTable
ALTER TABLE `holidays` ADD COLUMN `repeats_yearly` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'legal';

-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `report_type` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(50) NULL,
    `link` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_report_type`(`report_type`),
    INDEX `idx_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `parameters` JSON NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_report_id`(`report_id`),
    INDEX `idx_created_by`(`created_by`),
    INDEX `idx_is_default`(`is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `parameters` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `file_url` VARCHAR(255) NULL,
    `file_name` VARCHAR(255) NULL,
    `file_size` INTEGER NULL,
    `file_format` VARCHAR(10) NULL,
    `generated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completed_at` TIMESTAMP(0) NULL,
    `error_message` TEXT NULL,
    `scheduled_report` INTEGER NULL,

    INDEX `idx_report_id`(`report_id`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_generated_at`(`generated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_schedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `frequency` VARCHAR(20) NOT NULL,
    `schedule` JSON NOT NULL,
    `recipients` JSON NOT NULL,
    `parameters` JSON NULL,
    `formats` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,
    `last_run` TIMESTAMP(0) NULL,
    `next_run` TIMESTAMP(0) NULL,

    INDEX `idx_report_id`(`report_id`),
    INDEX `idx_created_by`(`created_by`),
    INDEX `idx_status`(`status`),
    INDEX `idx_next_run`(`next_run`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `report_templates` ADD CONSTRAINT `report_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_templates` ADD CONSTRAINT `report_templates_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_history` ADD CONSTRAINT `report_history_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_history` ADD CONSTRAINT `report_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedule` ADD CONSTRAINT `report_schedule_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedule` ADD CONSTRAINT `report_schedule_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
