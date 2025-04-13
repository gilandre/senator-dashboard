<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Models\User;
use App\Services\AuthService;
use App\Services\EmailService;
use App\Services\ValidationService;
use App\Core\View;
use App\Core\Session;
use App\Core\Redirect;
use Exception;

class AuthController extends Controller
{
    private User $userModel;
    protected Auth $auth;
    private AuthService $authService;
    private EmailService $emailService;
    private ValidationService $validationService;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
        $this->auth = new Auth();
        $this->authService = new AuthService();
        $this->emailService = new EmailService();
        $this->validationService = new ValidationService();
        $this->layout = 'auth';
    }

    public function showLogin()
    {
        if ($this->authService->isLoggedIn()) {
            header('Location: /dashboard');
            exit;
        }
        $this->view('auth/login');
    }

    public function login()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/login');
            return;
        }

        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $remember = isset($_POST['remember']) ? true : false;

        // Vérifier CSRF token
        if (!$this->validateCsrfToken()) {
            Session::setFlash('error', 'Session expirée. Veuillez réessayer.');
            $this->redirect('/login');
            return;
        }

        $userModel = new User();
        $user = $userModel->login($username, $password);

        if ($user) {
            $_SESSION['user'] = $user;
            $_SESSION['logged_in'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            // Gérer "Se souvenir de moi"
            if ($remember) {
                $token = bin2hex(random_bytes(32));
                $userModel->saveRememberToken($user['id'], $token);
                setcookie('remember_token', $token, time() + 30 * 24 * 60 * 60, '/');
                setcookie('user_id', $user['id'], time() + 30 * 24 * 60 * 60, '/');
            }
            
            $this->redirect('/dashboard');
        } else {
            Session::setFlash('error', 'Identifiants incorrects');
            $this->redirect('/login');
        }
    }

    public function logout()
    {
        // Détruire correctement la session
        if (session_status() === PHP_SESSION_ACTIVE) {
            // Supprimer toutes les variables de session
            $_SESSION = array();
            
            // Supprimer le cookie de session
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    $params["path"],
                    $params["domain"],
                    $params["secure"],
                    $params["httponly"]
                );
            }
            
            // Détruire la session
            session_destroy();
        }
        
        // Supprimer le cookie de mémorisation si présent
        if (isset($_COOKIE['remember_token'])) {
            setcookie('remember_token', '', time() - 3600, '/', '', true, true);
        }
        
        // Rediriger vers la page de connexion
        header('Location: /login');
        exit;
    }

    public function showForgotPassword()
    {
        $this->view('auth/forgot-password');
    }

    public function sendResetLink()
    {
        $email = $_POST['email'] ?? '';

        try {
            $user = $this->authService->findByEmail($email);
            
            if ($user) {
                $token = $this->authService->generateResetToken($user['id']);
                $this->emailService->sendResetPasswordEmail($email, $token);
                
                Session::setFlash('success', 'Un email de réinitialisation a été envoyé à votre adresse');
            } else {
                Session::setFlash('error', 'Aucun compte n\'est associé à cette adresse email');
            }
        } catch (Exception $e) {
            error_log("Erreur lors de l'envoi du lien de réinitialisation : " . $e->getMessage());
            Session::setFlash('error', 'Une erreur est survenue lors de l\'envoi de l\'email');
        }
        
        header('Location: /forgot-password');
        exit;
    }

    public function showResetPassword()
    {
        $token = $_GET['token'] ?? '';
        
        if (empty($token) || !$this->authService->validateResetToken($token)) {
            Session::setFlash('error', 'Le lien de réinitialisation est invalide ou a expiré');
            header('Location: /forgot-password');
            exit;
        }
        
        $this->view('auth/reset-password', ['token' => $token]);
    }

    public function resetPassword()
    {
        $token = $_POST['token'] ?? '';
        $password = $_POST['password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';
        
        if (empty($token) || !$this->authService->validateResetToken($token)) {
            Session::setFlash('error', 'Le lien de réinitialisation est invalide ou a expiré');
            header('Location: /forgot-password');
            exit;
        }
        
        if ($password !== $confirmPassword) {
            Session::setFlash('error', 'Les mots de passe ne correspondent pas');
            header('Location: /reset-password?token=' . $token);
            exit;
        }
        
        try {
            $this->authService->resetPassword($token, $password);
            Session::setFlash('success', 'Votre mot de passe a été réinitialisé avec succès');
            header('Location: /login');
            exit;
        } catch (Exception $e) {
            error_log("Erreur lors de la réinitialisation du mot de passe : " . $e->getMessage());
            Session::setFlash('error', 'Une erreur est survenue lors de la réinitialisation du mot de passe');
            header('Location: /reset-password?token=' . $token);
            exit;
        }
    }

    public function reactivateAccount()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $email = $_POST['email'] ?? '';
            
            try {
                $result = $this->authService->reactivateAccount($email);
                
                if ($result['success']) {
                    Session::setFlash('success', 'Votre compte a été réactivé avec succès.');
                } else {
                    Session::setFlash('error', 'Impossible de réactiver votre compte.');
                }
            } catch (\Exception $e) {
                Session::setFlash('error', $e->getMessage());
            }
        }

        $this->view('auth/reactivate_account');
    }
} 