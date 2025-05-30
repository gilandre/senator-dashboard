-- 1. Créer une colonne temporaire pour stocker le role_id
ALTER TABLE `users` ADD COLUMN `role_id` INT NULL;

-- 2. Mettre à jour les utilisateurs pour assigner role_id en fonction du rôle actuel
UPDATE `users` u
JOIN `roles` r ON r.name = u.role
SET u.role_id = r.id;

-- 3. Ajouter la contrainte de clé étrangère
ALTER TABLE `users` 
ADD CONSTRAINT `users_role_id_fkey` 
FOREIGN KEY (`role_id`) 
REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; 