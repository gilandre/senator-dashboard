<?php

namespace App\Models;

use App\Core\Database;
use PDO;

class Permission
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByUserId($userId)
    {
        $stmt = $this->db->prepare("
            SELECT p.*
            FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByRole($role)
    {
        $stmt = $this->db->prepare("
            SELECT p.*
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON r.id = rp.role_id
            WHERE r.name = ?
        ");
        $stmt->execute([$role]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($data)
    {
        $stmt = $this->db->prepare("
            INSERT INTO permissions (name, description, created_at, updated_at)
            VALUES (:name, :description, NOW(), NOW())
        ");

        $stmt->execute([
            'name' => $data['name'],
            'description' => $data['description'] ?? null
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
            UPDATE permissions
            SET " . implode(', ', $fields) . "
            WHERE id = :id
        ");

        return $stmt->execute($params);
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM permissions WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function assignToUser($permissionId, $userId)
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_permissions (user_id, permission_id, created_at)
            VALUES (?, ?, NOW())
        ");
        return $stmt->execute([$userId, $permissionId]);
    }

    public function removeFromUser($permissionId, $userId)
    {
        $stmt = $this->db->prepare("
            DELETE FROM user_permissions
            WHERE user_id = ? AND permission_id = ?
        ");
        return $stmt->execute([$userId, $permissionId]);
    }

    public function assignToRole($permissionId, $roleId)
    {
        $stmt = $this->db->prepare("
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES (?, ?, NOW())
        ");
        return $stmt->execute([$roleId, $permissionId]);
    }

    public function removeFromRole($permissionId, $roleId)
    {
        $stmt = $this->db->prepare("
            DELETE FROM role_permissions
            WHERE role_id = ? AND permission_id = ?
        ");
        return $stmt->execute([$roleId, $permissionId]);
    }

    public function findAll(): array
    {
        return $this->db->query("SELECT * FROM permissions")->fetchAll();
    }

    public function getById(int $id): ?array
    {
        $result = $this->db->query(
            "SELECT * FROM permissions WHERE id = ?",
            [$id]
        )->fetch();
        return $result ?: null;
    }

    public function getAll(): array
    {
        return $this->db->query("SELECT * FROM permissions ORDER BY name")->fetchAll();
    }

    public function getActivePermissions(): array
    {
        return $this->db->query("SELECT * FROM permissions WHERE is_active = TRUE ORDER BY name")->fetchAll();
    }

    public function assignToProfile(int $permissionId, int $profileId): bool
    {
        try {
            $this->db->query(
                "INSERT INTO profile_permissions (profile_id, permission_id, granted) VALUES (?, ?, TRUE)",
                [$profileId, $permissionId]
            );
            return true;
        } catch (\PDOException $e) {
            return false;
        }
    }

    public function revokeFromProfile(int $permissionId, int $profileId): bool
    {
        return $this->db->query(
            "DELETE FROM profile_permissions WHERE profile_id = ? AND permission_id = ?",
            [$profileId, $permissionId]
        )->rowCount() > 0;
    }

    public function getUserPermissions(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT p.* FROM permissions p
            INNER JOIN user_permissions up ON up.permission_id = p.id
            WHERE up.user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getProfilePermissions(int $profileId): array
    {
        return $this->db->query(
            "SELECT p.* FROM permissions p
            INNER JOIN profile_permissions pp ON pp.permission_id = p.id
            WHERE pp.profile_id = ? AND pp.granted = TRUE",
            [$profileId]
        )->fetchAll();
    }
} 