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
    remember_token VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active),
    INDEX idx_last_login (last_login),
    INDEX idx_password_reset (password_reset_token),
    INDEX idx_remember_token (remember_token)
) ENGINE=InnoDB;

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Table des logs d'accès
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    badge_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    group_name VARCHAR(100),
    status VARCHAR(50),
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    central VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_badge (badge_number),
    INDEX idx_event_date (event_date),
    INDEX idx_status (status),
    INDEX idx_group (group_name),
    INDEX idx_event_type (event_type),
    INDEX idx_central (central),
    INDEX idx_event_datetime (event_date, event_time),
    INDEX idx_badge_date (badge_number, event_date),
    INDEX idx_status_date (status, event_date),
    INDEX idx_group_date (group_name, event_date)
) ENGINE=InnoDB;

-- Table d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_action (action),
    INDEX idx_table (table_name),
    INDEX idx_created_at (created_at),
    INDEX idx_user_action (user_id, action),
    INDEX idx_table_record (table_name, record_id)
) ENGINE=InnoDB;

-- Table des import logs
CREATE TABLE IF NOT EXISTS import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    status ENUM('success', 'error', 'partial') NOT NULL,
    total_records INT NOT NULL DEFAULT 0,
    processed_records INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB;

-- Création de l'utilisateur admin par défaut
-- Le mot de passe est 'admin123' (à changer après la première connexion)
INSERT INTO users (username, password, email, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@senator.com', 'admin');

-- Table des menus
CREATE TABLE IF NOT EXISTS menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    route VARCHAR(100),
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_order (order_index),
    INDEX idx_parent (parent_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Table des boutons
CREATE TABLE IF NOT EXISTS buttons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    menu_id INT,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    INDEX idx_name (name),
    INDEX idx_menu (menu_id),
    INDEX idx_order (order_index),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Table des permissions par menu
CREATE TABLE IF NOT EXISTS menu_permissions (
    menu_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (menu_id, permission_id),
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_menu (menu_id),
    INDEX idx_permission (permission_id)
) ENGINE=InnoDB;

-- Table des permissions par bouton
CREATE TABLE IF NOT EXISTS button_permissions (
    button_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (button_id, permission_id),
    FOREIGN KEY (button_id) REFERENCES buttons(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_button (button_id),
    INDEX idx_permission (permission_id)
) ENGINE=InnoDB;

-- Table des règles de gestion
CREATE TABLE IF NOT EXISTS business_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Table des permissions conditionnelles
CREATE TABLE IF NOT EXISTS conditional_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_id INT NOT NULL,
    rule_id INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES business_rules(id) ON DELETE CASCADE,
    INDEX idx_permission (permission_id),
    INDEX idx_rule (rule_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Table des contextes de permission
CREATE TABLE IF NOT EXISTS permission_contexts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_id INT NOT NULL,
    context_type VARCHAR(50) NOT NULL,
    context_value VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_permission (permission_id),
    INDEX idx_context (context_type, context_value),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Table des plages horaires de permission
CREATE TABLE IF NOT EXISTS permission_time_ranges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_permission (permission_id),
    INDEX idx_day_time (day_of_week, start_time, end_time),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB; 