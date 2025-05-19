/*
  Warnings:

  - You are about to alter the column `event_type` on the `access_logs` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(8))` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE `access_logs` MODIFY `event_type` VARCHAR(255) NULL;
