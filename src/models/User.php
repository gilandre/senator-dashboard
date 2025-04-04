<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class User
{
    private $db;
    private $id;
    private $username;
    private $email;
    private $password;
    private $role;
    private $isActive;
    private $isLocked;
    private $failedAttempts;
    private $lastFailedAttempt;
    private $resetToken;
    private $resetTokenExpiresAt;
    private $passwordChangedAt;
    private $createdAt;
    private $updatedAt;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findById($id): ?User
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return null;
        }
        
        $user = new User();
        $user->id = $data['id'];
        $user->username = $data['username'];
        $user->email = $data['email'];
        $user->password = $data['password'];
        $user->role = $data['role'];
        $user->isActive = $data['is_active'];
        $user->isLocked = $data['is_locked'];
        $user->failedAttempts = $data['failed_attempts'] ?? 0;
        $user->lastFailedAttempt = $data['last_failed_attempt'];
        $user->resetToken = $data['reset_token'];
        $user->resetTokenExpiresAt = $data['reset_token_expires_at'];
        $user->passwordChangedAt = $data['password_changed_at'];
        $user->createdAt = $data['created_at'];
        $user->updatedAt = $data['updated_at'];
        
        return $user;
    }

    public function findByUsername($username): ?User
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return null;
        }
        
        $user = new User();
        $user->id = $data['id'];
        $user->username = $data['username'];
        $user->email = $data['email'];
        $user->password = $data['password'];
        $user->role = $data['role'];
        $user->isActive = $data['is_active'];
        $user->isLocked = $data['is_locked'];
        $user->failedAttempts = $data['failed_attempts'] ?? 0;
        $user->lastFailedAttempt = $data['last_failed_attempt'];
        $user->resetToken = $data['reset_token'];
        $user->resetTokenExpiresAt = $data['reset_token_expires_at'];
        $user->passwordChangedAt = $data['password_changed_at'];
        $user->createdAt = $data['created_at'];
        $user->updatedAt = $data['updated_at'];
        
        return $user;
    }

    public function findByEmail($email): ?User
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return null;
        }
        
        $user = new User();
        $user->id = $data['id'];
        $user->username = $data['username'];
        $user->email = $data['email'];
        $user->password = $data['password'];
        $user->role = $data['role'];
        $user->isActive = $data['is_active'];
        $user->isLocked = $data['is_locked'];
        $user->failedAttempts = $data['failed_attempts'] ?? 0;
        $user->lastFailedAttempt = $data['last_failed_attempt'];
        $user->resetToken = $data['reset_token'];
        $user->resetTokenExpiresAt = $data['reset_token_expires_at'];
        $user->passwordChangedAt = $data['password_changed_at'];
        $user->createdAt = $data['created_at'];
        $user->updatedAt = $data['updated_at'];
        
        return $user;
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO users (
                username, email, password, role, is_active, is_locked,
                failed_attempts, last_failed_attempt, reset_token,
                reset_token_expires_at, password_changed_at, created_at, updated_at
            ) VALUES (
                :username, :email, :password, :role, :is_active, :is_locked,
                :failed_attempts, :last_failed_attempt, :reset_token,
                :reset_token_expires_at, :password_changed_at, NOW(), NOW()
            )
        ");

        $stmt->execute([
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'role' => $data['role'] ?? 'user',
            'is_active' => $data['is_active'] ?? 1,
            'is_locked' => $data['is_locked'] ?? 0,
            'failed_attempts' => $data['failed_attempts'] ?? 0,
            'last_failed_attempt' => $data['last_failed_attempt'] ?? null,
            'reset_token' => $data['reset_token'] ?? null,
            'reset_token_expires_at' => $data['reset_token_expires_at'] ?? null,
            'password_changed_at' => $data['password_changed_at'] ?? null
        ]);

        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $fields = [];
        $params = ['id' => $id];

        foreach ($data as $key => $value) {
            if ($key !== 'id') {
                $fields[] = "{$key} = :{$key}";
                $params[$key] = $value;
            }
        }

        $fields[] = "updated_at = NOW()";

        $stmt = $this->db->prepare("
            UPDATE users
            SET " . implode(', ', $fields) . "
            WHERE id = :id
        ");

        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getId()
    {
        return $this->id;
    }

    public function getUsername()
    {
        return $this->username;
    }

    public function getEmail()
    {
        return $this->email;
    }

    public function getRole()
    {
        return $this->role;
    }

    public function getIsActive()
    {
        return $this->isActive;
    }

    public function getIsLocked()
    {
        return $this->isLocked;
    }

    public function getFailedAttempts()
    {
        return $this->failedAttempts;
    }

    public function getLastFailedAttempt()
    {
        return $this->lastFailedAttempt;
    }

    public function getResetToken()
    {
        return $this->resetToken;
    }

    public function getResetTokenExpiresAt()
    {
        return $this->resetTokenExpiresAt;
    }

    public function getPasswordChangedAt()
    {
        return $this->passwordChangedAt;
    }

    public function getCreatedAt()
    {
        return $this->createdAt;
    }

    public function getUpdatedAt()
    {
        return $this->updatedAt;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM users");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActiveUsers(): array
    {
        $stmt = $this->db->query("SELECT * FROM users WHERE is_active = 1");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAdmins(): array
    {
        $stmt = $this->db->query("SELECT * FROM users WHERE role = 'admin'");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public function changePassword(int $userId, string $newPassword): bool
    {
        return $this->update($userId, [
            'password' => $newPassword,
            'password_expired' => 0
        ]);
    }

    public function assignProfile(int $userId, int $profileId): bool
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_profiles (user_id, profile_id)
            VALUES (:user_id, :profile_id)
        ");
        
        return $stmt->execute([
            'user_id' => $userId,
            'profile_id' => $profileId
        ]);
    }

    public function removeProfile(int $userId, int $profileId): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM user_profiles
            WHERE user_id = :user_id AND profile_id = :profile_id
        ");
        
        return $stmt->execute([
            'user_id' => $userId,
            'profile_id' => $profileId
        ]);
    }

    public function getUserProfiles(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT p.* FROM profiles p
            JOIN user_profiles up ON p.id = up.profile_id
            WHERE up.user_id = :user_id
        ");
        
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserPermissions(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT DISTINCT p.* FROM permissions p
            JOIN profile_permissions pp ON p.id = pp.permission_id
            JOIN user_profiles up ON pp.profile_id = up.profile_id
            WHERE up.user_id = :user_id
        ");
        
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM users");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
} 