<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\User;
use App\Models\Profile;

class UserController extends Controller
{
    private User $userModel;
    private Profile $profileModel;
    private Auth $auth;

    public function __construct()
    {
        $this->userModel = new User();
        $this->profileModel = new Profile();
        $this->auth = new Auth();
    }

    public function index(): void
    {
        if (!$this->auth->hasPermission('user.view')) {
            $this->redirect('/dashboard');
        }

        $users = $this->userModel->getAll();
        $this->view('users/index', ['users' => $users]);
    }

    public function create(): void
    {
        if (!$this->auth->hasPermission('user.create')) {
            $this->redirect('/dashboard');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'email' => $_POST['email'] ?? '',
                'password' => $_POST['password'] ?? '',
                'first_name' => $_POST['first_name'] ?? '',
                'last_name' => $_POST['last_name'] ?? '',
                'is_active' => isset($_POST['is_active']),
                'is_admin' => isset($_POST['is_admin'])
            ];

            if (empty($data['email']) || empty($data['password'])) {
                $this->setError('Email and password are required');
            } else {
                $userId = $this->userModel->create($data);
                
                if (isset($_POST['profile_id'])) {
                    $this->userModel->assignProfile($userId, (int)$_POST['profile_id']);
                }

                $this->setSuccess('User created successfully');
                $this->redirect('/users');
            }
        }

        $profiles = $this->profileModel->getAll();
        $this->view('users/form', ['profiles' => $profiles]);
    }

    public function edit(int $id): void
    {
        if (!$this->auth->hasPermission('user.edit')) {
            $this->redirect('/dashboard');
        }

        $user = $this->userModel->getById($id);
        if (!$user) {
            $this->redirect('/users');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = [
                'email' => $_POST['email'] ?? '',
                'first_name' => $_POST['first_name'] ?? '',
                'last_name' => $_POST['last_name'] ?? '',
                'is_active' => isset($_POST['is_active']),
                'is_admin' => isset($_POST['is_admin'])
            ];

            if (!empty($_POST['password'])) {
                $data['password'] = $_POST['password'];
            }

            if (empty($data['email'])) {
                $this->setError('Email is required');
            } else {
                $this->userModel->update($id, $data);
                
                if (isset($_POST['profile_id'])) {
                    $this->userModel->assignProfile($id, (int)$_POST['profile_id']);
                }

                $this->setSuccess('User updated successfully');
                $this->redirect('/users');
            }
        }

        $profiles = $this->profileModel->getAll();
        $userProfiles = $this->userModel->getUserProfiles($id);
        $this->view('users/form', [
            'user' => $user,
            'profiles' => $profiles,
            'userProfiles' => $userProfiles
        ]);
    }

    public function delete(int $id): void
    {
        if (!$this->auth->hasPermission('user.delete')) {
            $this->redirect('/dashboard');
        }

        if ($id === $this->auth->getUserId()) {
            $this->setError('You cannot delete your own account');
        } else {
            $this->userModel->delete($id);
            $this->setSuccess('User deleted successfully');
        }

        $this->redirect('/users');
    }

    public function changePassword(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $currentPassword = $_POST['current_password'] ?? '';
            $newPassword = $_POST['new_password'] ?? '';
            $confirmPassword = $_POST['confirm_password'] ?? '';

            if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
                $this->setError('All fields are required');
            } elseif ($newPassword !== $confirmPassword) {
                $this->setError('New passwords do not match');
            } else {
                $user = $this->userModel->getById($this->auth->getUserId());
                
                if (!$this->userModel->verifyPassword($currentPassword, $user['password'])) {
                    $this->setError('Current password is incorrect');
                } else {
                    $this->userModel->changePassword($this->auth->getUserId(), $newPassword);
                    $this->setSuccess('Password changed successfully');
                    $this->redirect('/profile');
                }
            }
        }

        $this->view('users/change-password');
    }
} 