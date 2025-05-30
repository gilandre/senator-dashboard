-- 1. S'assurer que tous les utilisateurs ont un role_id correspondant à leur role actuel
UPDATE `users` u
LEFT JOIN `roles` r ON r.name COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci
SET u.role_id = r.id
WHERE u.role_id IS NULL AND r.id IS NOT NULL;

-- 2. S'assurer que tous les roles de la table roles sont dans reference_data
INSERT INTO `reference_data` (
  `type`, `code`, `value`, `display_name`, `description`, 
  `module`, `is_active`, `sort_order`, `color_code`, `icon_name`
)
SELECT 
  'role' as type, 
  r.name COLLATE utf8mb4_unicode_ci as code, 
  r.name COLLATE utf8mb4_unicode_ci as value, 
  CONCAT(UPPER(SUBSTRING(r.name, 1, 1)), SUBSTRING(r.name, 2)) COLLATE utf8mb4_unicode_ci as display_name,
  r.description COLLATE utf8mb4_unicode_ci,
  'users' as module,
  COALESCE(r.is_active, TRUE) as is_active,
  0 as sort_order,
  CASE 
    WHEN r.name COLLATE utf8mb4_unicode_ci = 'admin' THEN 'bg-blue-100 text-blue-800'
    WHEN r.name COLLATE utf8mb4_unicode_ci = 'user' THEN 'bg-green-100 text-green-800'
    ELSE 'bg-gray-100 text-gray-800'
  END as color_code,
  CASE 
    WHEN r.name COLLATE utf8mb4_unicode_ci = 'admin' THEN 'Shield'
    WHEN r.name COLLATE utf8mb4_unicode_ci = 'user' THEN 'User'
    ELSE 'CircleUser'
  END as icon_name
FROM `roles` r
LEFT JOIN `reference_data` rd ON rd.type = 'role' AND rd.code COLLATE utf8mb4_unicode_ci = r.name COLLATE utf8mb4_unicode_ci AND rd.module = 'users'
WHERE rd.id IS NULL; 