<?php

namespace App\Services;

use App\Core\Database;
use App\Models\User;
use App\Models\Permission;
use PDO;
use Exception;
use PDOException;

class AuthService
{
    private $db;
    private $user;
    private $permission;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->user = new User();
        $this->permission = new Permission();
    }

    public function isLoggedIn(): bool
    {
        return isset($_SESSION['user_id']);
    }

    public function authenticate($login, $password)
    {
        try {
            // Essayer d'abord par username
            $user = $this->user->findByUsername($login);
            
            // Si pas trouvé, essayer par email
            if (!$user) {
                $user = $this->user->findByEmail($login);
            }
            
            if (!$user) {
                return null;
            }
            
            if (!password_verify($password, $user->getPassword())) {
                $this->incrementFailedAttempts($user->getId());
                return null;
            }
            
            $this->resetFailedAttempts($user->getId());
            return $user;
        } catch (Exception $e) {
            error_log("Erreur d'authentification : " . $e->getMessage());
            return null;
        }
    }

    public function findByEmail($email)
    {
        return $this->user->findByEmail($email);
    }

    public function generateRememberToken($userId): string
    {
        try {
            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+30 days'));

            $stmt = $this->db->prepare("
                UPDATE users
                SET remember_token = :token,
                    remember_token_expires = :expiry
                WHERE id = :user_id
                  AND is_active = 1
            ");

            $stmt->execute([
                'token' => $token,
                'expiry' => $expiry,
                'user_id' => $userId
            ]);

            if ($stmt->rowCount() > 0) {
                return $token;
            }

            throw new Exception("Utilisateur non trouvé ou compte inactif");
        } catch (Exception $e) {
            error_log("Erreur lors de la génération du token de mémorisation : " . $e->getMessage());
            throw $e;
        }
    }

    public function validateRememberToken($token): bool
    {
        try {
            $stmt = $this->db->prepare("
                SELECT id
                FROM users
                WHERE remember_token = :token
                  AND remember_token_expires > NOW()
                  AND is_active = 1
            ");

            $stmt->execute(['token' => $token]);
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            error_log("Erreur lors de la validation du token de mémorisation : " . $e->getMessage());
            return false;
        }
    }

    public function generateResetToken($userId): string
    {
        try {
            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

            $stmt = $this->db->prepare("
                UPDATE users
                SET reset_token = :token,
                    reset_token_expires_at = :expiry
                WHERE id = :user_id
                  AND is_active = 1
            ");

            $stmt->execute([
                'token' => $token,
                'expiry' => $expiry,
                'user_id' => $userId
            ]);

            if ($stmt->rowCount() > 0) {
                return $token;
            }

            throw new Exception("Utilisateur non trouvé ou compte inactif");
        } catch (Exception $e) {
            error_log("Erreur lors de la génération du token de réinitialisation : " . $e->getMessage());
            throw $e;
        }
    }

    public function validateResetToken($token): bool
    {
        try {
            error_log("Validation du token de réinitialisation : " . $token);
            
            $stmt = $this->db->prepare("
                SELECT id
                FROM users
                WHERE reset_token = :token
                  AND reset_token_expires_at > NOW()
                  AND is_active = 1
            ");

            $stmt->execute(['token' => $token]);
            $result = $stmt->rowCount() > 0;
            
            error_log("Résultat de la validation : " . ($result ? "valide" : "invalide"));
            
            return $result;
        } catch (Exception $e) {
            error_log("Erreur lors de la validation du token de réinitialisation : " . $e->getMessage());
            return false;
        }
    }

    public function resetPassword($token, $password): bool
    {
        try {
            error_log("Début de la réinitialisation du mot de passe avec le token : " . $token);
            
            $this->db->beginTransaction();

            // Vérifier si le token est valide
            $stmt = $this->db->prepare("
                SELECT id
                FROM users
                WHERE reset_token = :token
                  AND reset_token_expires_at > NOW()
                  AND is_active = 1
            ");
            $stmt->execute(['token' => $token]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                error_log("Token invalide ou expiré");
                throw new Exception("Token invalide ou expiré");
            }

            error_log("Utilisateur trouvé avec l'ID : " . $user['id']);

            // Mettre à jour le mot de passe
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $this->db->prepare("
                UPDATE users
                SET password = :password,
                    reset_token = NULL,
                    reset_token_expires_at = NULL,
                    password_changed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :user_id
            ");

            $stmt->execute([
                'password' => $hashedPassword,
                'user_id' => $user['id']
            ]);

            $this->db->commit();
            error_log("Mot de passe mis à jour pour l'utilisateur : " . $user['id']);
            
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Erreur lors de la réinitialisation du mot de passe : " . $e->getMessage());
            throw $e;
        }
    }

    private function incrementFailedAttempts($userId)
    {
        try {
            // Vérification simplifiée pour SQLite/MySQL
            try {
                // Plutôt que de chercher la colonne, on essaie d'exécuter la requête
                // et on attrape une éventuelle exception
                $stmt = $this->db->prepare("
                    UPDATE users
                    SET failed_attempts = failed_attempts + 1,
                        last_failed_attempt = NOW()
                    WHERE id = :user_id
                ");
                $stmt->execute(['user_id' => $userId]);
                
                error_log("Incrémentation des tentatives échouées pour l'utilisateur ID: " . $userId);
            } catch (PDOException $e) {
                // Si erreur de colonne manquante, on log simplement
                if (strpos($e->getMessage(), "failed_attempts") !== false) {
                    error_log("Colonne 'failed_attempts' non trouvée dans la table users - fonctionnalité désactivée");
                } else {
                    // Autres erreurs SQL
                    throw $e;
                }
            }
        } catch (Exception $e) {
            error_log("Erreur lors de l'incrémentation des tentatives échouées : " . $e->getMessage());
        }
    }

    private function resetFailedAttempts($userId)
    {
        try {
            // Vérification simplifiée pour SQLite/MySQL
            try {
                // Plutôt que de chercher la colonne, on essaie d'exécuter la requête
                // et on attrape une éventuelle exception
                $stmt = $this->db->prepare("
                    UPDATE users
                    SET failed_attempts = 0,
                        last_failed_attempt = NULL
                    WHERE id = :user_id
                ");
                $stmt->execute(['user_id' => $userId]);
                
                error_log("Réinitialisation des tentatives échouées pour l'utilisateur ID: " . $userId);
            } catch (PDOException $e) {
                // Si erreur de colonne manquante, on log simplement
                if (strpos($e->getMessage(), "failed_attempts") !== false) {
                    error_log("Colonne 'failed_attempts' non trouvée dans la table users - fonctionnalité désactivée");
                } else {
                    // Autres erreurs SQL
                    throw $e;
                }
            }
        } catch (Exception $e) {
            error_log("Erreur lors de la réinitialisation des tentatives échouées : " . $e->getMessage());
        }
    }

    public function reactivateAccount($email): array
    {
        try {
            $user = $this->user->findByEmail($email);
            
            if (!$user) {
                throw new Exception("Aucun compte trouvé avec cette adresse e-mail.");
            }
            
            if ($user->getIsActive()) {
                throw new Exception("Ce compte est déjà actif.");
            }
            
            try {
                $stmt = $this->db->prepare("
                    UPDATE users
                    SET is_active = 1,
                        is_locked = 0,
                        failed_attempts = 0,
                        last_failed_attempt = NULL
                    WHERE id = :user_id
                ");
                
                $stmt->execute(['user_id' => $user->getId()]);
            } catch (PDOException $e) {
                // Si erreur de colonne manquante, on utilise une requête alternative
                if (strpos($e->getMessage(), "failed_attempts") !== false) {
                    $stmt = $this->db->prepare("
                        UPDATE users
                        SET is_active = 1,
                            is_locked = 0
                        WHERE id = :user_id
                    ");
                    
                    $stmt->execute(['user_id' => $user->getId()]);
                } else {
                    // Autres erreurs SQL
                    throw $e;
                }
            }
            
            return [
                'success' => true,
                'message' => "Le compte a été réactivé avec succès."
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
} 