<?php

namespace App\Models;

use App\Core\Database;

class Menu
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO menus (name, label, icon, route, order_index, is_active, parent_id)
            VALUES (:name, :label, :icon, :route, :order_index, :is_active, :parent_id)
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'label' => $data['label'],
            'icon' => $data['icon'] ?? null,
            'route' => $data['route'] ?? null,
            'order_index' => $data['order_index'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'parent_id' => $data['parent_id'] ?? null
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->db->prepare("
            UPDATE menus 
            SET name = :name,
                label = :label,
                icon = :icon,
                route = :route,
                order_index = :order_index,
                is_active = :is_active,
                parent_id = :parent_id
            WHERE id = :id
        ");
        
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'label' => $data['label'],
            'icon' => $data['icon'] ?? null,
            'route' => $data['route'] ?? null,
            'order_index' => $data['order_index'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'parent_id' => $data['parent_id'] ?? null
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM menus WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM menus WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public function getAll(): array
    {
        $stmt = $this->db->query("
            SELECT m.*, p.name as parent_name 
            FROM menus m 
            LEFT JOIN menus p ON m.parent_id = p.id 
            ORDER BY m.order_index, m.name
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getActiveMenus(): array
    {
        $stmt = $this->db->query("
            SELECT m.*, p.name as parent_name 
            FROM menus m 
            LEFT JOIN menus p ON m.parent_id = p.id 
            WHERE m.is_active = TRUE 
            ORDER BY m.order_index, m.name
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getMenuTree(): array
    {
        $menus = $this->getActiveMenus();
        $tree = [];
        
        foreach ($menus as $menu) {
            if ($menu['parent_id'] === null) {
                $tree[$menu['id']] = $menu;
                $tree[$menu['id']]['children'] = [];
            }
        }
        
        foreach ($menus as $menu) {
            if ($menu['parent_id'] !== null && isset($tree[$menu['parent_id']])) {
                $tree[$menu['parent_id']]['children'][] = $menu;
            }
        }
        
        return array_values($tree);
    }

    public function assignPermissions(int $menuId, array $permissionIds): bool
    {
        $this->db->beginTransaction();
        try {
            // Supprimer les permissions existantes
            $stmt = $this->db->prepare("DELETE FROM menu_permissions WHERE menu_id = :menu_id");
            $stmt->execute(['menu_id' => $menuId]);

            // Ajouter les nouvelles permissions
            $stmt = $this->db->prepare("
                INSERT INTO menu_permissions (menu_id, permission_id, granted)
                VALUES (:menu_id, :permission_id, TRUE)
            ");

            foreach ($permissionIds as $permissionId) {
                $stmt->execute([
                    'menu_id' => $menuId,
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

    public function getMenuPermissions(int $menuId): array
    {
        $stmt = $this->db->prepare("
            SELECT p.*, mp.granted
            FROM permissions p
            JOIN menu_permissions mp ON p.id = mp.permission_id
            WHERE mp.menu_id = :menu_id
        ");
        $stmt->execute(['menu_id' => $menuId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAccessibleMenus(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT DISTINCT m.*
            FROM menus m
            LEFT JOIN menu_permissions mp ON m.id = mp.menu_id
            LEFT JOIN permissions p ON mp.permission_id = p.id
            LEFT JOIN profile_permissions pp ON p.id = pp.permission_id
            LEFT JOIN user_profiles up ON pp.profile_id = up.profile_id
            LEFT JOIN user_permissions up2 ON p.id = up2.permission_id
            WHERE m.is_active = TRUE
            AND (
                up.user_id = :user_id
                OR up2.user_id = :user_id
            )
            ORDER BY m.order_index, m.name
        ");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
} 