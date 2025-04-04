<?php

namespace App\Models;

use App\Core\Database;

class Button
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO buttons (name, label, icon, action, order_index, is_active, menu_id)
            VALUES (:name, :label, :icon, :action, :order_index, :is_active, :menu_id)
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'label' => $data['label'],
            'icon' => $data['icon'] ?? null,
            'action' => $data['action'],
            'order_index' => $data['order_index'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'menu_id' => $data['menu_id']
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->db->prepare("
            UPDATE buttons 
            SET name = :name,
                label = :label,
                icon = :icon,
                action = :action,
                order_index = :order_index,
                is_active = :is_active,
                menu_id = :menu_id
            WHERE id = :id
        ");
        
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'label' => $data['label'],
            'icon' => $data['icon'] ?? null,
            'action' => $data['action'],
            'order_index' => $data['order_index'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'menu_id' => $data['menu_id']
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM buttons WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT b.*, m.name as menu_name 
            FROM buttons b 
            LEFT JOIN menus m ON b.menu_id = m.id 
            WHERE b.id = :id
        ");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public function getAll(): array
    {
        $stmt = $this->db->query("
            SELECT b.*, m.name as menu_name 
            FROM buttons b 
            LEFT JOIN menus m ON b.menu_id = m.id 
            ORDER BY b.order_index, b.name
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getActiveButtons(): array
    {
        $stmt = $this->db->query("
            SELECT b.*, m.name as menu_name 
            FROM buttons b 
            LEFT JOIN menus m ON b.menu_id = m.id 
            WHERE b.is_active = TRUE 
            ORDER BY b.order_index, b.name
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getButtonsByMenu(int $menuId): array
    {
        $stmt = $this->db->prepare("
            SELECT b.* 
            FROM buttons b 
            WHERE b.menu_id = :menu_id 
            AND b.is_active = TRUE 
            ORDER BY b.order_index, b.name
        ");
        $stmt->execute(['menu_id' => $menuId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function assignPermissions(int $buttonId, array $permissionIds): bool
    {
        $this->db->beginTransaction();
        try {
            // Supprimer les permissions existantes
            $stmt = $this->db->prepare("DELETE FROM button_permissions WHERE button_id = :button_id");
            $stmt->execute(['button_id' => $buttonId]);

            // Ajouter les nouvelles permissions
            $stmt = $this->db->prepare("
                INSERT INTO button_permissions (button_id, permission_id, granted)
                VALUES (:button_id, :permission_id, TRUE)
            ");

            foreach ($permissionIds as $permissionId) {
                $stmt->execute([
                    'button_id' => $buttonId,
                    'permission_id' => $permissionId
                ]);
            }

            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getButtonPermissions(int $buttonId): array
    {
        $stmt = $this->db->prepare("
            SELECT p.*, bp.granted
            FROM permissions p
            JOIN button_permissions bp ON p.id = bp.permission_id
            WHERE bp.button_id = :button_id
        ");
        $stmt->execute(['button_id' => $buttonId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAccessibleButtons(int $userId, int $menuId): array
    {
        $stmt = $this->db->prepare("
            SELECT DISTINCT b.*
            FROM buttons b
            LEFT JOIN button_permissions bp ON b.id = bp.button_id
            LEFT JOIN permissions p ON bp.permission_id = p.id
            LEFT JOIN profile_permissions pp ON p.id = pp.permission_id
            LEFT JOIN user_profiles up ON pp.profile_id = up.profile_id
            LEFT JOIN user_permissions up2 ON p.id = up2.permission_id
            WHERE b.is_active = TRUE
            AND b.menu_id = :menu_id
            AND (
                up.user_id = :user_id
                OR up2.user_id = :user_id
            )
            ORDER BY b.order_index, b.name
        ");
        $stmt->execute([
            'user_id' => $userId,
            'menu_id' => $menuId
        ]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
} 