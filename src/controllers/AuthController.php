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
        $this->layout = 'layouts/auth';
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
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $remember = isset($_POST['remember']);
        $csrfToken = $_POST['csrf_token'] ?? '';
        
        // Créer un fichier de log dans un dossier accessible en écriture
        $logFile = __DIR__ . '/../../auth_debug.log';
        file_put_contents($logFile, "=== TENTATIVE DE CONNEXION ===\n", FILE_APPEND);
        file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
        file_put_contents($logFile, "Username: {$username}\n", FILE_APPEND);
        file_put_contents($logFile, "Password: [masqué]\n", FILE_APPEND);
        file_put_contents($logFile, "Session ID: " . session_id() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session status: " . session_status() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session data: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
        file_put_contents($logFile, "CSRF Token (POST): {$csrfToken}\n", FILE_APPEND);
        file_put_contents($logFile, "CSRF Token (SESSION): " . ($_SESSION['csrf_token'] ?? 'non défini') . "\n", FILE_APPEND);

        try {
            // Connexion directe à la base de données pour vérifier l'utilisateur
            $pdo = new \PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            
            // Vérification de l'utilisateur
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$user) {
                file_put_contents($logFile, "ERREUR: Utilisateur '{$username}' non trouvé dans la base de données\n", FILE_APPEND);
                $_SESSION['flash_error'] = 'Identifiants incorrects';
                header('Location: /login');
                exit;
            }
            
            file_put_contents($logFile, "Utilisateur trouvé: ID = {$user['id']}\n", FILE_APPEND);
            
            // Vérification du mot de passe
            if (!password_verify($password, $user['password'])) {
                file_put_contents($logFile, "ERREUR: Mot de passe incorrect\n", FILE_APPEND);
                $_SESSION['flash_error'] = 'Identifiants incorrects';
                header('Location: /login');
                exit;
            }
            
            file_put_contents($logFile, "Mot de passe vérifié avec succès\n", FILE_APPEND);
            
            // Vérification de l'état du compte
            if (!$user['is_active']) {
                file_put_contents($logFile, "ERREUR: Compte utilisateur inactif\n", FILE_APPEND);
                $_SESSION['flash_error'] = 'Ce compte est inactif';
                header('Location: /login');
                exit;
            }
            
            // Configuration de la session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            file_put_contents($logFile, "Session après authentification: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
            
            // Gestion du remember me
            if ($remember) {
                $token = bin2hex(random_bytes(32));
                $expiry = time() + (30 * 24 * 60 * 60); // 30 jours
                
                $stmt = $pdo->prepare("INSERT INTO remember_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
                $stmt->execute([$user['id'], $token, date('Y-m-d H:i:s', $expiry)]);
                
                setcookie('remember_token', $token, $expiry, '/', '', false, true);
                file_put_contents($logFile, "Cookie 'remember_token' créé\n", FILE_APPEND);
            }
            
            file_put_contents($logFile, "Authentification réussie - Redirection vers /dashboard\n", FILE_APPEND);
            header('Location: /dashboard');
            exit;
            
        } catch (\Exception $e) {
            file_put_contents($logFile, "EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
            file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
            $_SESSION['flash_error'] = 'Une erreur est survenue lors de la connexion';
            header('Location: /login');
            exit;
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