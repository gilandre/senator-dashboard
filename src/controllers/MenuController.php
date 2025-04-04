<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Menu;
use App\Models\Permission;

class MenuController extends Controller
{
    private Menu $menuModel;
    private Permission $permissionModel;

    public function __construct()
    {
        parent::__construct();
        $this->menuModel = new Menu();
        $this->permissionModel = new Permission();
    }

    public function index(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        $menus = $this->menuModel->getAll();
        $this->view('menus/index', [
            'menus' => $menus,
            'title' => 'Gestion des Menus'
        ]);
    }

    public function create(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'name' => $_POST['name'] ?? '',
                'label' => $_POST['label'] ?? '',
                'icon' => $_POST['icon'] ?? null,
                'route' => $_POST['route'] ?? null,
                'order_index' => $_POST['order_index'] ?? 0,
                'is_active' => isset($_POST['is_active']),
                'parent_id' => !empty($_POST['parent_id']) ? (int)$_POST['parent_id'] : null
            ];

            $menuId = $this->menuModel->create($data);

            if ($menuId && isset($_POST['permissions'])) {
                $this->menuModel->assignPermissions($menuId, $_POST['permissions']);
            }

            $this->redirect('/menus');
            return;
        }

        $menus = $this->menuModel->getAll();
        $permissions = $this->permissionModel->getAll();
        
        $this->view('menus/create', [
            'menus' => $menus,
            'permissions' => $permissions,
            'title' => 'Créer un Menu'
        ]);
    }

    public function edit(int $id): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        $menu = $this->menuModel->getById($id);
        if (!$menu) {
            $this->redirect('/menus');
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'name' => $_POST['name'] ?? '',
                'label' => $_POST['label'] ?? '',
                'icon' => $_POST['icon'] ?? null,
                'route' => $_POST['route'] ?? null,
                'order_index' => $_POST['order_index'] ?? 0,
                'is_active' => isset($_POST['is_active']),
                'parent_id' => !empty($_POST['parent_id']) ? (int)$_POST['parent_id'] : null
            ];

            if ($this->menuModel->update($id, $data)) {
                if (isset($_POST['permissions'])) {
                    $this->menuModel->assignPermissions($id, $_POST['permissions']);
                }
                $this->redirect('/menus');
                return;
            }
        }

        $menus = $this->menuModel->getAll();
        $permissions = $this->permissionModel->getAll();
        $menuPermissions = $this->menuModel->getMenuPermissions($id);
        
        $this->view('menus/edit', [
            'menu' => $menu,
            'menus' => $menus,
            'permissions' => $permissions,
            'menuPermissions' => $menuPermissions,
            'title' => 'Modifier le Menu'
        ]);
    }

    public function delete(int $id): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        if ($this->menuModel->delete($id)) {
            $this->redirect('/menus');
            return;
        }

        $this->view('error', [
            'message' => 'Erreur lors de la suppression du menu',
            'title' => 'Erreur'
        ]);
    }

    public function getMenuTree(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->json(['error' => 'Non authentifié'], 401);
            return;
        }

        $menuTree = $this->menuModel->getMenuTree();
        $this->json($menuTree);
    }

    public function getAccessibleMenus(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->json(['error' => 'Non authentifié'], 401);
            return;
        }

        $userId = $this->auth->getUserId();
        $menus = $this->menuModel->getAccessibleMenus($userId);
        $this->json($menus);
    }
} 