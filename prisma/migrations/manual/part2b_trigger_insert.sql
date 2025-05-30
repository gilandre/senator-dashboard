-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS sync_user_role_after_insert;

-- Créer le trigger pour les nouvelles insertions
CREATE TRIGGER sync_user_role_after_insert
AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
  -- Si seul role est défini, définir role_id
  IF NEW.role IS NOT NULL AND NEW.role_id IS NULL THEN
    UPDATE `users` u
    JOIN `roles` r ON r.name COLLATE utf8mb4_unicode_ci = NEW.role COLLATE utf8mb4_unicode_ci
    SET u.role_id = r.id
    WHERE u.id = NEW.id;
  END IF;
  
  -- Si seul role_id est défini, définir role
  IF NEW.role_id IS NOT NULL AND NEW.role IS NULL THEN
    UPDATE `users` u
    JOIN `roles` r ON r.id = NEW.role_id
    SET u.role = r.name COLLATE utf8mb4_unicode_ci
    WHERE u.id = NEW.id;
  END IF;
END; 