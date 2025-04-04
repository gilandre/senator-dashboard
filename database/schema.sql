-- Création de la base de données
CREATE DATABASE IF NOT EXISTS senator_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE senator_db;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login DATETIME,
    login_attempts INT NOT NULL DEFAULT 0,
    last_attempt DATETIME,
    password_reset_token VARCHAR(100),
    password_reset_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des logs d'accès
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_value JSON,
    new_value JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des profils
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des permissions
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des permissions des profils
CREATE TABLE IF NOT EXISTS profile_permissions (
    profile_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, permission_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Table des permissions des utilisateurs
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Table des profils des utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT NOT NULL,
    profile_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, profile_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Insertion des habilitations de base
INSERT INTO permissions (name, description) VALUES
-- Gestion des utilisateurs
('user.view', 'Voir les utilisateurs'),
('user.create', 'Créer des utilisateurs'),
('user.edit', 'Modifier les utilisateurs'),
('user.delete', 'Supprimer les utilisateurs'),

-- Gestion des profils
('profile.view', 'Voir les profils'),
('profile.create', 'Créer des profils'),
('profile.edit', 'Modifier les profils'),
('profile.delete', 'Supprimer les profils'),

-- Gestion des rapports
('report.view', 'Voir les rapports'),
('report.export', 'Exporter les rapports'),
('report.create', 'Créer des rapports');

-- Création du profil administrateur
INSERT INTO profiles (name, description, is_active) VALUES
('admin', 'Administrateur système', TRUE);

-- Création de l'utilisateur administrateur par défaut
INSERT INTO users (username, email, password, role, is_active) VALUES
('admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE);

-- Attribution de toutes les permissions au profil administrateur
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT 
    (SELECT id FROM profiles WHERE name = 'admin'),
    id
FROM permissions;

-- Attribution du profil administrateur à l'utilisateur admin
INSERT INTO user_profiles (user_id, profile_id)
SELECT 
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM profiles WHERE name = 'admin'); 