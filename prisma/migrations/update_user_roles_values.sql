-- Mettre à jour les utilisateurs pour assigner role_id en fonction du rôle actuel
UPDATE `users` u
JOIN `roles` r ON r.name = u.role
SET u.role_id = r.id;

-- Afficher les utilisateurs mis à jour
SELECT id, name, email, role, role_id FROM users; 