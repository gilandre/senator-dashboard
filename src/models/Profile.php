<?php

namespace App\Models;

use App\Core\Database;

class Profile
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO profiles (name, description, is_active, is_temporary, start_date, end_date)
            VALUES (:name, :description, :is_active, :is_temporary, :start_date, :end_date)
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'description' => $data['description'],
            'is_active' => $data['is_active'] ?? true,
            'is_temporary' => $data['is_temporary'] ?? false,
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null
        ]);

        return (int) $this->db->getConnection()->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->db->getConnection()->prepare("
            UPDATE profiles 
            SET name = :name,
                description = :description,
                is_active = :is_active,
                is_temporary = :is_temporary,
                start_date = :start_date,
                end_date = :end_date
            WHERE id = :id
        ");
        
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'description' => $data['description'],
            'is_active' => $data['is_active'] ?? true,
            'is_temporary' => $data['is_temporary'] ?? false,
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->getConnection()->prepare("DELETE FROM profiles WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM profiles WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public function getAll(): array
    {
        $stmt = $this->db->getConnection()->query("SELECT * FROM profiles ORDER BY name");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getActiveProfiles(): array
    {
        $stmt = $this->db->getConnection()->query("
            SELECT * FROM profiles 
            WHERE is_active = TRUE 
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            ORDER BY name
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function assignPermissions(int $profileId, array $permissionIds): bool
    {
        $this->db->getConnection()->beginTransaction();
        try {
            // Supprimer les permissions existantes
            $stmt = $this->db->getConnection()->prepare("DELETE FROM profile_permissions WHERE profile_id = :profile_id");
            $stmt->execute(['profile_id' => $profileId]);

            // Ajouter les nouvelles permissions
            $stmt = $this->db->getConnection()->prepare("
                INSERT INTO profile_permissions (profile_id, permission_id, granted)
                VALUES (:profile_id, :permission_id, TRUE)
            ");

            foreach ($permissionIds as $permissionId) {
                $stmt->execute([
                    'profile_id' => $profileId,
                    'permission_id' => $permissionId
                ]);
            }

            $this->db->getConnection()->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->getConnection()->rollBack();
            return false;
        }
    }

    public function getProfilePermissions(int $profileId): array
    {
        $stmt = $this->db->getConnection()->prepare("
            SELECT p.*, pp.granted
            FROM permissions p
            JOIN profile_permissions pp ON p.id = pp.permission_id
            WHERE pp.profile_id = :profile_id
        ");
        $stmt->execute(['profile_id' => $profileId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
} 