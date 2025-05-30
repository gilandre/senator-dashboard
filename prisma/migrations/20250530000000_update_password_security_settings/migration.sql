-- Suppression de l'ancien champ default_password
ALTER TABLE security_settings DROP COLUMN IF EXISTS default_password;

-- Ajout des nouveaux champs pour la gestion des mots de passe temporaires
ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS temp_password_length INT NOT NULL DEFAULT 16;
ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS temp_password_expiry_hours INT NOT NULL DEFAULT 24;

-- Configuration spécifique par rôle (stocké en JSON)
ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS role_password_policies JSON NULL;

-- Nettoyage des anciennes données de reference_data liées aux mots de passe par défaut
DELETE FROM reference_data WHERE type = 'default_password' AND module = 'security';

-- Insertion des valeurs par défaut
INSERT INTO security_settings 
  (temp_password_length, temp_password_expiry_hours, role_password_policies, created_at, updated_at)
VALUES 
  (16, 24, 
   '{"admin": {"min_length": 16, "require_uppercase": true, "require_numbers": true, "require_special": true},
     "operator": {"min_length": 14, "require_uppercase": true, "require_numbers": true, "require_special": true},
     "user": {"min_length": 12, "require_uppercase": true, "require_numbers": true, "require_special": true}}',
   NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  temp_password_length = VALUES(temp_password_length),
  temp_password_expiry_hours = VALUES(temp_password_expiry_hours),
  role_password_policies = VALUES(role_password_policies),
  updated_at = NOW(); 