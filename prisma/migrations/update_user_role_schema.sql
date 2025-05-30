-- Ajouter une colonne role_id qui fait référence à la table des rôles
ALTER TABLE `users` ADD COLUMN `role_id` INT NULL;

-- Créer une contrainte de clé étrangère pour role_id qui référence la table roles
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Mettre à jour les valeurs role_id basées sur la colonne role actuelle
UPDATE `users` u
JOIN `roles` r ON r.name = u.role
SET u.role_id = r.id;

-- Les modifications ci-dessous seront gérées par les modifications du schéma Prisma
-- et nous permettront de migrer progressivement vers l'utilisation de role_id
-- sans casser l'application existante

-- NOTE: Ne pas supprimer la colonne role pour l'instant
-- ALTER TABLE `users` DROP COLUMN `role`; 