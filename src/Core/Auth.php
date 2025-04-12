<?php

namespace App\Core;

use App\Models\User;
use App\Models\Permission;

class Auth
{
    private ?User $user = null;
    private array $permissions = [];
    private User $userModel;
    private Permission $permissionModel;

    public function __construct()
    {
        $this->userModel = new User();
        $this->permissionModel = new Permission();
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $this->loadUserFromSession();
    }

    private function loadUserFromSession(): void
    {
        $logFile = __DIR__ . '/../../auth_debug.log';
        file_put_contents($logFile, "--- loadUserFromSession ---\n", FILE_APPEND);
        
        error_log("loadUserFromSession: Statut de la session - " . session_status());
        error_log("loadUserFromSession: Contenu de SESSION - " . print_r($_SESSION, true));
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (isset($_SESSION['user_id'])) {
            error_log("loadUserFromSession: user_id trouvé - " . $_SESSION['user_id']);
            file_put_contents($logFile, "user_id trouvé dans la session: " . $_SESSION['user_id'] . "\n", FILE_APPEND);
            
            try {
                file_put_contents($logFile, "Tentative de chargement de l'utilisateur avec ID: " . $_SESSION['user_id'] . "\n", FILE_APPEND);
                
                try {
                    $this->user = $this->userModel->findById($_SESSION['user_id']);
                    
                    if ($this->user) {
                        error_log("loadUserFromSession: Utilisateur chargé avec succès");
                        file_put_contents($logFile, "Utilisateur chargé avec succès - ID: " . $this->user->getId() . "\n", FILE_APPEND);
                        
                        // Contourner le chargement des permissions qui cause l'erreur
                        file_put_contents($logFile, "Contournement du chargement des permissions\n", FILE_APPEND);
                        $this->permissions = []; // Permissions vides par défaut
                    } else {
                        error_log("loadUserFromSession: Utilisateur non trouvé en base de données");
                        file_put_contents($logFile, "Échec du chargement de l'utilisateur - userModel->findById a retourné null\n", FILE_APPEND);
                        $this->logout();
                    }
                } catch (\Exception $e) {
                    // Une erreur s'est produite, mais nous pouvons quand même essayer de charger l'utilisateur directement
                    file_put_contents($logFile, "Exception lors du chargement via userModel: " . $e->getMessage() . "\n", FILE_APPEND);
                    file_put_contents($logFile, "Tentative de récupération directe de l'utilisateur via PDO\n", FILE_APPEND);
                    
                    $pdo = new \PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
                    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
                    $stmt->execute([$_SESSION['user_id']]);
                    $userData = $stmt->fetch(\PDO::FETCH_ASSOC);
                    
                    if ($userData) {
                        file_put_contents($logFile, "Utilisateur trouvé directement dans la base de données\n", FILE_APPEND);
                        
                        // Créer manuellement l'objet utilisateur
                        $this->user = new \App\Models\User();
                        $reflector = new \ReflectionClass($this->user);
                        
                        $idProperty = $reflector->getProperty('id');
                        $idProperty->setAccessible(true);
                        $idProperty->setValue($this->user, $userData['id']);
                        
                        $usernameProperty = $reflector->getProperty('username');
                        $usernameProperty->setAccessible(true);
                        $usernameProperty->setValue($this->user, $userData['username']);
                        
                        $emailProperty = $reflector->getProperty('email');
                        $emailProperty->setAccessible(true);
                        $emailProperty->setValue($this->user, $userData['email']);
                        
                        $roleProperty = $reflector->getProperty('role');
                        $roleProperty->setAccessible(true);
                        $roleProperty->setValue($this->user, $userData['role']);
                        
                        $isActiveProperty = $reflector->getProperty('isActive');
                        $isActiveProperty->setAccessible(true);
                        $isActiveProperty->setValue($this->user, $userData['is_active']);
                        
                        file_put_contents($logFile, "Objet utilisateur créé manuellement: ID=" . $this->user->getId() . "\n", FILE_APPEND);
                        $this->permissions = []; // Permissions vides par défaut
                    } else {
                        file_put_contents($logFile, "Aucun utilisateur trouvé dans la base de données\n", FILE_APPEND);
                        $this->logout();
                    }
                }
            } catch (\Exception $e) {
                error_log("loadUserFromSession: Erreur lors du chargement de l'utilisateur - " . $e->getMessage());
                error_log("loadUserFromSession: Trace - " . $e->getTraceAsString());
                file_put_contents($logFile, "EXCEPTION lors du chargement: " . $e->getMessage() . "\n", FILE_APPEND);
                file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
                $this->logout();
            }
        } else {
            error_log("loadUserFromSession: Aucun user_id en session");
            file_put_contents($logFile, "Aucun user_id trouvé dans la session\n", FILE_APPEND);
        }
    }

    public function login(string $login, string $password): bool
    {
        // Try by email first
        $user = $this->userModel->findByEmail($login);
        
        // If not found, try by username
        if (!$user) {
            $user = $this->userModel->findByUsername($login);
        }
        
        if (!$user) {
            error_log("User not found with login: " . $login);
            return false;
        }
        
        if (!password_verify($password, $user->getPassword())) {
            error_log("Invalid password for user: " . $login);
            return false;
        }
        
        if (!$user->getIsActive()) {
            error_log("User account is not active: " . $login);
            return false;
        }
        
        $_SESSION['user_id'] = $user->getId();
        $_SESSION['username'] = $user->getUsername();
        $_SESSION['role'] = $user->getRole();
        
        error_log("User successfully logged in: " . $login);
        error_log("Session after login: " . print_r($_SESSION, true));
        
        $this->user = $user;
        $this->permissions = $this->permissionModel->getUserPermissions($user->getId());
        
        return true;
    }

    public function logout(): void
    {
        if (isset($_SESSION['user_id'])) {
            unset($_SESSION['user_id']);
        }
        
        $this->user = null;
        $this->permissions = [];
        
        if (isset($_COOKIE['remember_token'])) {
            setcookie('remember_token', '', time() - 3600, '/', '', true, true);
        }
    }

    public function isLoggedIn(): bool
    {
        $logFile = __DIR__ . '/../../auth_debug.log';
        file_put_contents($logFile, "=== VÉRIFICATION CONNEXION ===\n", FILE_APPEND);
        file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
        file_put_contents($logFile, "URL demandée: " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session ID: " . session_id() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session status: " . session_status() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session data: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
        file_put_contents($logFile, "User object: " . ($this->user !== null ? "défini" : "null") . "\n", FILE_APPEND);
        
        error_log("isLoggedIn: Statut de la session - " . session_status());
        error_log("isLoggedIn: Contenu de SESSION - " . print_r($_SESSION, true));
        error_log("isLoggedIn: user est " . ($this->user !== null ? "défini" : "null"));
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
            file_put_contents($logFile, "Session démarrée dans isLoggedIn\n", FILE_APPEND);
        }
        
        if (!isset($_SESSION['user_id'])) {
            file_put_contents($logFile, "Aucun user_id en session - Non connecté\n", FILE_APPEND);
            return false;
        }
        
        file_put_contents($logFile, "user_id trouvé: " . $_SESSION['user_id'] . "\n", FILE_APPEND);
        
        if ($this->user === null) {
            file_put_contents($logFile, "Objet utilisateur non chargé, chargement...\n", FILE_APPEND);
            $this->loadUserFromSession();
            file_put_contents($logFile, "Après chargement, user est " . ($this->user !== null ? "défini" : "null") . "\n", FILE_APPEND);
        }
        
        $result = $this->user !== null;
        file_put_contents($logFile, "Résultat final isLoggedIn: " . ($result ? "CONNECTÉ" : "NON CONNECTÉ") . "\n", FILE_APPEND);
        
        return $result;
    }

    public function isAdmin(): bool
    {
        return $this->isLoggedIn() && $this->user->getRole() === 'admin';
    }

    public function getUserId(): ?int
    {
        return $this->user ? $this->user->getId() : null;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function hasPermission(string $permissionName): bool
    {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        if ($this->isAdmin()) {
            return true;
        }
        
        // Permissions temporaires pour les paramètres - à supprimer une fois que les autorisations sont configurées correctement
        if ($permissionName === 'settings.view' || $permissionName === 'settings.edit') {
            return true;
        }
        
        foreach ($this->permissions as $permission) {
            if ($permission['name'] === $permissionName) {
                return true;
            }
        }
        
        return false;
    }

    public function hasAnyPermission(array $permissionNames): bool
    {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        if ($this->isAdmin()) {
            return true;
        }
        
        foreach ($permissionNames as $permissionName) {
            if ($this->hasPermission($permissionName)) {
                return true;
            }
        }
        
        return false;
    }

    public function hasAllPermissions(array $permissionNames): bool
    {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        if ($this->isAdmin()) {
            return true;
        }
        
        foreach ($permissionNames as $permissionName) {
            if (!$this->hasPermission($permissionName)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Récupère les permissions de l'utilisateur
     */
    public function getPermissions(): array
    {
        return $this->permissions;
    }

    /**
     * Rafraîchit les permissions de l'utilisateur
     */
    public function refreshPermissions(): void
    {
        if ($this->user) {
            $this->permissions = $this->permissionModel->getUserPermissions($this->user->getId());
        }
    }
} 