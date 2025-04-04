<?php

namespace Tests\Functional;

use PHPUnit\Framework\TestCase;
use App\Controllers\AuthController;
use App\Services\AuthService;
use App\Services\EmailService;
use App\Services\LogService;
use App\Services\ValidationService;
use App\Services\Database;
use PDO;

class AuthControllerTest extends TestCase
{
    private AuthController $controller;
    private PDO $pdo;
    private string $testDbPath;
    private EmailService $emailService;

    protected function setUp(): void
    {
        parent::setUp();

        // Configuration de la base de données SQLite pour les tests
        $this->testDbPath = __DIR__ . '/../../tests/test.db';
        Database::setConfig([
            'driver' => 'sqlite',
            'path' => $this->testDbPath
        ]);

        $this->pdo = Database::getInstance();
        
        // Création des services
        $authService = new AuthService();
        $this->emailService = $this->createMock(EmailService::class);
        $this->emailService->method('sendPasswordResetEmail')
            ->willReturn(true);
        $this->emailService->method('sendAccountReactivationEmail')
            ->willReturn(true);
        
        $logService = $this->createMock(LogService::class);
        $validationService = $this->createMock(ValidationService::class);
        $validationService->method('validate')
            ->willReturn(true);

        // Création du contrôleur
        $this->controller = new AuthController(
            $authService,
            $this->emailService,
            $logService,
            $validationService
        );

        // Création de la table users
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                is_blocked BOOLEAN DEFAULT 0,
                login_attempts INTEGER DEFAULT 0,
                last_login_attempt DATETIME,
                reset_token VARCHAR(100),
                reset_token_expires DATETIME,
                remember_token VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Insertion d'un utilisateur de test
        $stmt = $this->pdo->prepare("
            INSERT INTO users (username, email, password, is_active, is_blocked)
            VALUES (:username, :email, :password, :is_active, :is_blocked)
        ");
        
        $stmt->execute([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => password_hash('Test123!', PASSWORD_DEFAULT),
            'is_active' => 1,
            'is_blocked' => 0
        ]);

        // Initialiser la session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        // Nettoyage de la base de données
        $this->pdo->exec("DROP TABLE IF EXISTS users");
        if (file_exists($this->testDbPath)) {
            unlink($this->testDbPath);
        }

        // Nettoyage de la session
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }

        parent::tearDown();
    }

    public function testLoginWithValidCredentials(): void
    {
        $_POST['username'] = 'testuser';
        $_POST['password'] = 'Test123!';
        
        $response = $this->controller->login();
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('user_id', $_SESSION);
    }

    public function testLoginWithInvalidCredentials(): void
    {
        $_POST['username'] = 'testuser';
        $_POST['password'] = 'wrongpassword';
        
        $response = $this->controller->login();
        $this->assertFalse($response['success']);
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }

    public function testForgotPasswordWithValidEmail(): void
    {
        $_POST['email'] = 'test@example.com';
        
        $this->emailService->expects($this->once())
            ->method('sendPasswordResetEmail')
            ->with('test@example.com', $this->anything())
            ->willReturn(true);
        
        $response = $this->controller->forgotPassword();
        $this->assertTrue($response['success']);
        
        $stmt = $this->pdo->query("SELECT reset_token FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        $this->assertNotNull($user['reset_token']);
    }

    public function testResetPasswordWithValidToken(): void
    {
        // Générer un token de réinitialisation
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET reset_token = :token,
                reset_token_expires = :expiry
            WHERE email = 'test@example.com'
        ");
        $stmt->execute(['token' => $token, 'expiry' => $expiry]);

        $_POST['token'] = $token;
        $_POST['password'] = 'NewTest123!';
        $_POST['password_confirm'] = 'NewTest123!';
        
        $response = $this->controller->resetPassword();
        $this->assertTrue($response['success']);
        
        $stmt = $this->pdo->query("SELECT password FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        $this->assertTrue(password_verify('NewTest123!', $user['password']));
    }

    public function testReactivateAccountWithValidEmail(): void
    {
        $this->pdo->exec("UPDATE users SET is_active = 0 WHERE email = 'test@example.com'");
        
        $_POST['email'] = 'test@example.com';
        
        $this->emailService->expects($this->once())
            ->method('sendAccountReactivationEmail')
            ->with('test@example.com')
            ->willReturn(true);
        
        $response = $this->controller->reactivateAccount();
        $this->assertTrue($response['success']);
        
        $stmt = $this->pdo->query("SELECT is_active FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        $this->assertEquals(1, $user['is_active']);
    }

    public function testLogout(): void
    {
        $_SESSION['user_id'] = 1;
        
        $response = $this->controller->logout();
        $this->assertTrue($response['success']);
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }
} 