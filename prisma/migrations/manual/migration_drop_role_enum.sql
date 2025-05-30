-- Migration: Supprimer progressivement l'utilisation de l'enum role dans la table users
-- Cette migration fait partie de l'amélioration du modèle de gestion des rôles

-- 1. S'assurer que tous les utilisateurs ont un role_id correspondant à leur role actuel
UPDATE `users` u
LEFT JOIN `roles` r ON r.name = u.role
SET u.role_id = r.id
WHERE u.role_id IS NULL AND r.id IS NOT NULL;

-- 2. S'assurer que tous les roles de la table roles sont dans reference_data
INSERT INTO `reference_data` (
  `type`, `code`, `value`, `display_name`, `description`, 
  `module`, `is_active`, `sort_order`, `color_code`, `icon_name`
)
SELECT 
  'role' as type, 
  r.name as code, 
  r.name as value, 
  CONCAT(UPPER(SUBSTRING(r.name, 1, 1)), SUBSTRING(r.name, 2)) as display_name,
  r.description,
  'users' as module,
  COALESCE(r.is_active, TRUE) as is_active,
  0 as sort_order,
  CASE 
    WHEN r.name = 'admin' THEN 'bg-blue-100 text-blue-800'
    WHEN r.name = 'user' THEN 'bg-green-100 text-green-800'
    ELSE 'bg-gray-100 text-gray-800'
  END as color_code,
  CASE 
    WHEN r.name = 'admin' THEN 'Shield'
    WHEN r.name = 'user' THEN 'User'
    ELSE 'CircleUser'
  END as icon_name
FROM `roles` r
LEFT JOIN `reference_data` rd ON rd.type = 'role' AND rd.code = r.name AND rd.module = 'users'
WHERE rd.id IS NULL;

-- 3. Supprimer la contrainte par défaut sur la colonne role
-- Exécuter uniquement lorsque tous les utilisateurs ont un role_id valide
-- ALTER TABLE `users` ALTER COLUMN `role` DROP DEFAULT;

-- 4. Modifier la colonne role pour la rendre nullable (étape transitoire)
-- ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'operator', 'viewer', 'user') NULL;

-- 5. Créer un déclencheur (trigger) pour maintenir la cohérence entre role et role_id
DELIMITER //
CREATE TRIGGER IF NOT EXISTS sync_user_role_after_update
AFTER UPDATE ON `users`
FOR EACH ROW
BEGIN
  -- Si role_id a changé mais pas role, mettre à jour role
  IF NEW.role_id IS NOT NULL AND (OLD.role_id <> NEW.role_id OR OLD.role_id IS NULL) THEN
    UPDATE `users` u
    JOIN `roles` r ON r.id = NEW.role_id
    SET u.role = r.name
    WHERE u.id = NEW.id;
  END IF;
  
  -- Si role a changé mais pas role_id, mettre à jour role_id
  IF NEW.role <> OLD.role THEN
    UPDATE `users` u
    JOIN `roles` r ON r.name = NEW.role
    SET u.role_id = r.id
    WHERE u.id = NEW.id;
  END IF;
END //
DELIMITER ;

-- 6. Créer un déclencheur pour les nouvelles insertions
DELIMITER //
CREATE TRIGGER IF NOT EXISTS sync_user_role_after_insert
AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
  -- Si seul role est défini, définir role_id
  IF NEW.role IS NOT NULL AND NEW.role_id IS NULL THEN
    UPDATE `users` u
    JOIN `roles` r ON r.name = NEW.role
    SET u.role_id = r.id
    WHERE u.id = NEW.id;
  END IF;
  
  -- Si seul role_id est défini, définir role
  IF NEW.role_id IS NOT NULL AND NEW.role IS NULL THEN
    UPDATE `users` u
    JOIN `roles` r ON r.id = NEW.role_id
    SET u.role = r.name
    WHERE u.id = NEW.id;
  END IF;
END //
DELIMITER ;

-- Note: Les étapes 3 et 4 sont commentées car elles nécessitent une validation manuelle
-- et peuvent potentiellement perturber l'application existante.
-- Ces modifications devraient être appliquées après une période de test
-- avec les triggers de synchronisation. 