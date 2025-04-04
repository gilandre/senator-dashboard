<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\EmailService;

class ProfileController extends BaseController
{
    private AuthService $authService;
    private EmailService $emailService;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->emailService = new EmailService();
    }

    public function index()
    {
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            header('Location: /login');
            exit;
        }

        $user = $this->authService->getUserById($userId);
        require_once __DIR__ . '/../views/profile/index.php';
    }

    public function update()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: /profile');
            exit;
        }

        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            header('Location: /login');
            exit;
        }

        $email = $_POST['email'] ?? '';
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';

        try {
            // Vérifier le mot de passe actuel
            if (!$this->authService->verifyPassword($userId, $currentPassword)) {
                throw new \Exception('Le mot de passe actuel est incorrect.');
            }

            // Mettre à jour l'email
            if ($email !== $_SESSION['email']) {
                $this->authService->updateEmail($userId, $email);
                $_SESSION['email'] = $email;
            }

            // Mettre à jour le mot de passe si fourni
            if (!empty($newPassword)) {
                if ($newPassword !== $confirmPassword) {
                    throw new \Exception('Les nouveaux mots de passe ne correspondent pas.');
                }

                $this->authService->updatePassword($userId, $newPassword);
            }

            $success = 'Votre profil a été mis à jour avec succès.';
        } catch (\Exception $e) {
            $error = $e->getMessage();
        }

        $user = $this->authService->getUserById($userId);
        require_once __DIR__ . '/../views/profile/index.php';
    }

    public function changePassword()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: /profile');
            exit;
        }

        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            header('Location: /login');
            exit;
        }

        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';

        try {
            // Vérifier le mot de passe actuel
            if (!$this->authService->verifyPassword($userId, $currentPassword)) {
                throw new \Exception('Le mot de passe actuel est incorrect.');
            }

            if ($newPassword !== $confirmPassword) {
                throw new \Exception('Les nouveaux mots de passe ne correspondent pas.');
            }

            $this->authService->updatePassword($userId, $newPassword);
            $success = 'Votre mot de passe a été modifié avec succès.';
        } catch (\Exception $e) {
            $error = $e->getMessage();
        }

        $user = $this->authService->getUserById($userId);
        require_once __DIR__ . '/../views/profile/index.php';
    }
} 