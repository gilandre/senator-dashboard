<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Button;
use App\Models\Menu;
use App\Models\Permission;

class ButtonController extends Controller
{
    private Button $buttonModel;
    private Menu $menuModel;
    private Permission $permissionModel;

    public function __construct()
    {
        parent::__construct();
        $this->buttonModel = new Button();
        $this->menuModel = new Menu();
        $this->permissionModel = new Permission();
    }

    public function index(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        $buttons = $this->buttonModel->getAll();
        $this->view('buttons/index', [
            'buttons' => $buttons,
            'title' => 'Gestion des Boutons'
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
                'action' => $_POST['action'] ?? '',
                'order_index' => $_POST['order_index'] ?? 0,
                'is_active' => isset($_POST['is_active']),
                'menu_id' => (int)($_POST['menu_id'] ?? 0)
            ];

            $buttonId = $this->buttonModel->create($data);

            if ($buttonId && isset($_POST['permissions'])) {
                $this->buttonModel->assignPermissions($buttonId, $_POST['permissions']);
            }

            $this->redirect('/buttons');
            return;
        }

        $menus = $this->menuModel->getAll();
        $permissions = $this->permissionModel->getAll();
        
        $this->view('buttons/create', [
            'menus' => $menus,
            'permissions' => $permissions,
            'title' => 'Créer un Bouton'
        ]);
    }

    public function edit(int $id): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        $button = $this->buttonModel->getById($id);
        if (!$button) {
            $this->redirect('/buttons');
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'name' => $_POST['name'] ?? '',
                'label' => $_POST['label'] ?? '',
                'icon' => $_POST['icon'] ?? null,
                'action' => $_POST['action'] ?? '',
                'order_index' => $_POST['order_index'] ?? 0,
                'is_active' => isset($_POST['is_active']),
                'menu_id' => (int)($_POST['menu_id'] ?? 0)
            ];

            if ($this->buttonModel->update($id, $data)) {
                if (isset($_POST['permissions'])) {
                    $this->buttonModel->assignPermissions($id, $_POST['permissions']);
                }
                $this->redirect('/buttons');
                return;
            }
        }

        $menus = $this->menuModel->getAll();
        $permissions = $this->permissionModel->getAll();
        $buttonPermissions = $this->buttonModel->getButtonPermissions($id);
        
        $this->view('buttons/edit', [
            'button' => $button,
            'menus' => $menus,
            'permissions' => $permissions,
            'buttonPermissions' => $buttonPermissions,
            'title' => 'Modifier le Bouton'
        ]);
    }

    public function delete(int $id): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
            return;
        }

        if ($this->buttonModel->delete($id)) {
            $this->redirect('/buttons');
            return;
        }

        $this->view('error', [
            'message' => 'Erreur lors de la suppression du bouton',
            'title' => 'Erreur'
        ]);
    }

    public function getButtonsByMenu(int $menuId): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->json(['error' => 'Non authentifié'], 401);
            return;
        }

        $userId = $this->auth->getUserId();
        $buttons = $this->buttonModel->getAccessibleButtons($userId, $menuId);
        $this->json($buttons);
    }
} 