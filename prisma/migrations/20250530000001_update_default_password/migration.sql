-- Mettre à jour les politiques de mot de passe par rôle
UPDATE security_settings
SET role_password_policies = JSON_REPLACE(
  COALESCE(role_password_policies, 
    '{"default":{"min_length":12,"require_uppercase":true,"require_numbers":true,"require_special":true},
    "admin":{"min_length":16,"require_uppercase":true,"require_numbers":true,"require_special":true},
    "operator":{"min_length":14,"require_uppercase":true,"require_numbers":true,"require_special":true},
    "user":{"min_length":12,"require_uppercase":true,"require_numbers":true,"require_special":true}}'
  ),
  -- Remplacer les valeurs des mots de passe générés par rôle
  '$.default.password', 'P@ssw0rd',
  '$.admin.password', 'P@ssw0rd',
  '$.operator.password', 'P@ssw0rd',
  '$.user.password', 'P@ssw0rd'
); 