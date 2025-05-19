/*
  Warnings:

  - Made the column `company` on table `visitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `visitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `visitors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `visitors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `visitors` ADD COLUMN `access_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `first_seen` DATETIME(3) NULL,
    ADD COLUMN `last_seen` DATETIME(3) NULL,
    MODIFY `company` VARCHAR(255) NOT NULL,
    MODIFY `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `updated_at` DATETIME(3) NOT NULL;
