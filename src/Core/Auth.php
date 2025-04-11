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
        error_log("loadUserFromSession: Statut de la session - " . session_status());
        error_log("loadUserFromSession: Contenu de SESSION - " . print_r($_SESSION, true));
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (isset($_SESSION['user_id'])) {
            error_log("loadUserFromSession: user_id trouvé - " . $_SESSION['user_id']);
            try {
                $this->user = $this->userModel->findById($_SESSION['user_id']);
                if ($this->user) {
                    error_log("loadUserFromSession: Utilisateur chargé avec succès");
                    $this->permissions = $this->permissionModel->getUserPermissions($this->user->getId());
                } else {
                    error_log("loadUserFromSession: Utilisateur non trouvé en base de données");
                    $this->logout();
                }
            } catch (\Exception $e) {
                error_log("loadUserFromSession: Erreur lors du chargement de l'utilisateur - " . $e->getMessage());
                error_log("loadUserFromSession: Trace - " . $e->getTraceAsString());
                $this->logout();
            }
        } else {
            error_log("loadUserFromSession: Aucun user_id en session");
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
        error_log("isLoggedIn: Statut de la session - " . session_status());
        error_log("isLoggedIn: Contenu de SESSION - " . print_r($_SESSION, true));
        error_log("isLoggedIn: user est " . ($this->user !== null ? "défini" : "null"));
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            return false;
        }
        
        if ($this->user === null) {
            $this->loadUserFromSession();
        }
        
        return $this->user !== null;
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