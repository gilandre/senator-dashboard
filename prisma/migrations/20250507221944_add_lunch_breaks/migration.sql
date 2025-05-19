-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'operator', 'viewer', 'user') NOT NULL DEFAULT 'user',
    `first_login` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `password_expiry_date` DATETIME(3) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(191) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',

    UNIQUE INDEX `email`(`email`),
    INDEX `idx_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `user_id` INTEGER NOT NULL,
    `profile_id` INTEGER NOT NULL,

    INDEX `profile_id`(`profile_id`),
    PRIMARY KEY (`user_id`, `profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `module` VARCHAR(255) NULL,
    `action` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_permissions` (
    `profile_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `permission_id`(`permission_id`),
    PRIMARY KEY (`profile_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_incidents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `user_id` INTEGER NULL,
    `ip_address` VARCHAR(45) NULL,
    `status` ENUM('info', 'warning', 'critical', 'resolved', 'locked') NULL DEFAULT 'info',
    `occurred_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolved_at` TIMESTAMP(0) NULL,
    `resolved_by` INTEGER NULL,

    INDEX `resolved_by`(`resolved_by`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `badge_number` VARCHAR(50) NOT NULL,
    `person_type` ENUM('employee', 'visitor') NOT NULL,
    `event_date` DATE NOT NULL,
    `event_time` TIME(0) NOT NULL,
    `reader` VARCHAR(255) NULL,
    `terminal` VARCHAR(255) NULL,
    `event_type` ENUM('entry', 'exit', 'unknown') NULL DEFAULT 'unknown',
    `direction` VARCHAR(50) NULL,
    `full_name` VARCHAR(255) NULL,
    `group_name` VARCHAR(255) NULL,
    `processed` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_badge`(`badge_number`),
    INDEX `idx_date`(`event_date`),
    INDEX `idx_event_type`(`event_type`),
    INDEX `idx_reader`(`reader`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `person_id` INTEGER NOT NULL,
    `person_type` ENUM('employee', 'visitor') NOT NULL,
    `direction` ENUM('in', 'out') NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `device_id` VARCHAR(100) NOT NULL,
    `timestamp` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `status` ENUM('valid', 'invalid', 'pending') NULL DEFAULT 'valid',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_location_timestamp`(`location`, `timestamp`),
    INDEX `idx_person`(`person_id`, `person_type`),
    INDEX `idx_person_type_timestamp`(`person_type`, `timestamp`),
    INDEX `idx_timestamp`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anomalies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `badge_number` VARCHAR(50) NULL,
    `description` TEXT NOT NULL,
    `severity` ENUM('low', 'medium', 'high') NULL DEFAULT 'medium',
    `status` ENUM('new', 'investigating', 'resolved', 'dismissed') NULL DEFAULT 'new',
    `detected_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolved_at` TIMESTAMP(0) NULL,
    `resolved_by` INTEGER NULL,

    INDEX `resolved_by`(`resolved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `work_start_time` TIME(0) NULL DEFAULT '09:00:00',
    `work_end_time` TIME(0) NULL DEFAULT '17:00:00',
    `lunch_start_time` TIME(0) NULL DEFAULT '12:00:00',
    `lunch_end_time` TIME(0) NULL DEFAULT '13:00:00',
    `work_days` VARCHAR(20) NULL DEFAULT '1,2,3,4,5',
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` INTEGER NULL,

    INDEX `updated_by`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `start_hour` VARCHAR(5) NOT NULL DEFAULT '08:00',
    `end_hour` VARCHAR(5) NOT NULL DEFAULT '17:00',
    `daily_hours` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    `count_weekends` BOOLEAN NULL DEFAULT false,
    `count_holidays` BOOLEAN NULL DEFAULT false,
    `lunch_break` BOOLEAN NULL DEFAULT true,
    `lunch_break_duration` INTEGER NULL DEFAULT 60,
    `lunch_break_start` VARCHAR(5) NULL DEFAULT '12:00',
    `lunch_break_end` VARCHAR(5) NULL DEFAULT '13:00',
    `allow_other_breaks` BOOLEAN NULL DEFAULT true,
    `max_break_time` INTEGER NULL DEFAULT 30,
    `absence_request_deadline` INTEGER NULL DEFAULT 3,
    `overtime_request_deadline` INTEGER NULL DEFAULT 5,
    `round_attendance_time` BOOLEAN NULL DEFAULT false,
    `rounding_interval` INTEGER NULL DEFAULT 15,
    `rounding_direction` ENUM('up', 'down', 'nearest') NULL DEFAULT 'nearest',
    `last_updated` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(100) NULL DEFAULT 'system',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `departments_name_key`(`name`),
    INDEX `idx_department_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `badge_number` VARCHAR(50) NOT NULL,
    `employee_id` VARCHAR(50) NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `department` VARCHAR(255) NULL,
    `position` VARCHAR(255) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'active',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `department_id` INTEGER NULL,

    UNIQUE INDEX `badge_number`(`badge_number`),
    UNIQUE INDEX `employee_id`(`employee_id`),
    UNIQUE INDEX `email`(`email`),
    INDEX `idx_badge`(`badge_number`),
    INDEX `idx_department`(`department`),
    INDEX `idx_department_id`(`department_id`),
    INDEX `idx_employee_id`(`employee_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NULL,

    UNIQUE INDEX `holidays_date_key`(`date`),
    INDEX `created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `enabled` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `permission_id`(`permission_id`),
    UNIQUE INDEX `idx_role_permission`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `is_default` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    INDEX `idx_is_active`(`is_active`),
    INDEX `idx_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `min_password_length` INTEGER NULL DEFAULT 8,
    `require_special_chars` BOOLEAN NULL DEFAULT true,
    `require_numbers` BOOLEAN NULL DEFAULT true,
    `require_uppercase` BOOLEAN NULL DEFAULT true,
    `password_history_count` INTEGER NULL DEFAULT 3,
    `max_login_attempts` INTEGER NULL DEFAULT 5,
    `lock_duration_minutes` INTEGER NULL DEFAULT 30,
    `two_factor_auth_enabled` BOOLEAN NULL DEFAULT false,
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` INTEGER NULL,

    INDEX `updated_by`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `timestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visitors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `badge_number` VARCHAR(50) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `company` VARCHAR(255) NULL,
    `reason` TEXT NULL,
    `status` ENUM('active', 'inactive') NULL DEFAULT 'active',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `badge_number`(`badge_number`),
    INDEX `idx_badge`(`badge_number`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_type` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NULL,
    `details` TEXT NULL,
    `error_details` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_log_user_id_idx`(`user_id`),
    INDEX `auth_log_email_idx`(`email`),
    INDEX `auth_log_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheet_entry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `break_duration` INTEGER NOT NULL DEFAULT 0,
    `activity_type` VARCHAR(100) NOT NULL,
    `project_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `timesheet_entry_user_id_idx`(`user_id`),
    INDEX `timesheet_entry_project_id_idx`(`project_id`),
    INDEX `timesheet_entry_task_id_idx`(`task_id`),
    INDEX `timesheet_entry_date_idx`(`date`),
    INDEX `timesheet_entry_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `client_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `project_id` INTEGER NOT NULL,
    `deadline` DATE NULL,
    `estimated_hours` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `task_code_key`(`code`),
    INDEX `task_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_ibfk_2` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profile_permissions` ADD CONSTRAINT `profile_permissions_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profile_permissions` ADD CONSTRAINT `profile_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `security_incidents` ADD CONSTRAINT `security_incidents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `security_incidents` ADD CONSTRAINT `security_incidents_ibfk_2` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `anomalies` ADD CONSTRAINT `anomalies_ibfk_1` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance_config` ADD CONSTRAINT `attendance_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `password_history` ADD CONSTRAINT `password_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `security_settings` ADD CONSTRAINT `security_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_activities` ADD CONSTRAINT `user_activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `timesheet_entry` ADD CONSTRAINT `timesheet_entry_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheet_entry` ADD CONSTRAINT `timesheet_entry_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheet_entry` ADD CONSTRAINT `timesheet_entry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
