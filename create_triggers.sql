DELIMITER //

DROP TRIGGER IF EXISTS sync_user_role_after_update//
CREATE TRIGGER sync_user_role_after_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  DECLARE role_name VARCHAR(255);
  
  -- Si le role_id a changé, mettre à jour le champ role
  IF NEW.role_id IS NOT NULL AND (OLD.role_id <> NEW.role_id OR OLD.role_id IS NULL) THEN
    -- Récupérer le nom du rôle depuis la table roles
    SELECT name INTO role_name FROM roles WHERE id = NEW.role_id;
    
    -- Mettre à jour le champ role via une connexion séparée (SQL direct)
    SET @update_sql = CONCAT('UPDATE users SET role = "', role_name, '" WHERE id = ', NEW.id);
    PREPARE stmt FROM @update_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
  
  -- Si le role a changé, mettre à jour le champ role_id
  IF NEW.role <> OLD.role THEN
    -- Récupérer l'ID du rôle correspondant au nom
    SELECT id INTO @role_id FROM roles WHERE name COLLATE utf8mb4_unicode_ci = NEW.role COLLATE utf8mb4_unicode_ci LIMIT 1;
    
    IF @role_id IS NOT NULL THEN
      -- Mettre à jour le champ role_id via une connexion séparée (SQL direct)
      SET @update_sql = CONCAT('UPDATE users SET role_id = ', @role_id, ' WHERE id = ', NEW.id);
      PREPARE stmt FROM @update_sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
END//

DROP TRIGGER IF EXISTS sync_user_role_after_insert//
CREATE TRIGGER sync_user_role_after_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  -- Si role est défini mais pas role_id, mettre à jour role_id
  IF NEW.role IS NOT NULL AND NEW.role_id IS NULL THEN
    -- Récupérer l'ID du rôle correspondant au nom
    SELECT id INTO @role_id FROM roles WHERE name COLLATE utf8mb4_unicode_ci = NEW.role COLLATE utf8mb4_unicode_ci LIMIT 1;
    
    IF @role_id IS NOT NULL THEN
      -- Mettre à jour le champ role_id via une connexion séparée (SQL direct)
      SET @update_sql = CONCAT('UPDATE users SET role_id = ', @role_id, ' WHERE id = ', NEW.id);
      PREPARE stmt FROM @update_sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
  
  -- Si role_id est défini mais pas role, mettre à jour role
  IF NEW.role_id IS NOT NULL AND NEW.role IS NULL THEN
    -- Récupérer le nom du rôle depuis la table roles
    SELECT name INTO @role_name FROM roles WHERE id = NEW.role_id;
    
    IF @role_name IS NOT NULL THEN
      -- Mettre à jour le champ role via une connexion séparée (SQL direct)
      SET @update_sql = CONCAT('UPDATE users SET role = "', @role_name, '" WHERE id = ', NEW.id);
      PREPARE stmt FROM @update_sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
END//

DELIMITER ; 