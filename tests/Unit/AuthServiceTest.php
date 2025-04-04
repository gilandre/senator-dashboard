<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\AuthService;
use App\Services\Database;
use PDO;

class AuthServiceTest extends TestCase
{
    private AuthService $authService;
    private PDO $pdo;
    private string $testDbPath;

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
        $this->authService = new AuthService();

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
        $result = $this->authService->login('testuser', 'Test123!');
        $this->assertTrue($result);
        $this->assertArrayHasKey('user_id', $_SESSION);
    }

    public function testLoginWithInvalidCredentials(): void
    {
        $result = $this->authService->login('testuser', 'wrongpassword');
        $this->assertFalse($result);
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }

    public function testLoginWithInactiveAccount(): void
    {
        $this->pdo->exec("UPDATE users SET is_active = 0 WHERE username = 'testuser'");
        $result = $this->authService->login('testuser', 'Test123!');
        $this->assertFalse($result);
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }

    public function testLoginWithBlockedAccount(): void
    {
        $this->pdo->exec("UPDATE users SET is_blocked = 1 WHERE username = 'testuser'");
        $result = $this->authService->login('testuser', 'Test123!');
        $this->assertFalse($result);
        $this->assertArrayNotHasKey('user_id', $_SESSION);
    }

    public function testGenerateResetToken(): void
    {
        $token = $this->authService->generateResetToken('test@example.com');
        $this->assertIsString($token);
        
        $stmt = $this->pdo->query("SELECT reset_token, reset_token_expires FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        
        $this->assertNotNull($user['reset_token']);
        $this->assertNotNull($user['reset_token_expires']);
    }

    public function testResetPassword(): void
    {
        $token = $this->authService->generateResetToken('test@example.com');
        $result = $this->authService->resetPassword($token, 'NewTest123!');
        $this->assertTrue($result);
        
        $stmt = $this->pdo->query("SELECT password FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        
        $this->assertTrue(password_verify('NewTest123!', $user['password']));
    }

    public function testReactivateAccount(): void
    {
        $this->pdo->exec("UPDATE users SET is_active = 0 WHERE username = 'testuser'");
        $result = $this->authService->reactivateAccount('test@example.com');
        $this->assertTrue($result);
        
        $stmt = $this->pdo->query("SELECT is_active FROM users WHERE email = 'test@example.com'");
        $user = $stmt->fetch();
        
        $this->assertEquals(1, $user['is_active']);
    }

    public function testRememberMe(): void
    {
        $result = $this->authService->login('testuser', 'Test123!', true);
        $this->assertTrue($result);
        
        $stmt = $this->pdo->query("SELECT remember_token FROM users WHERE username = 'testuser'");
        $user = $stmt->fetch();
        
        $this->assertNotNull($user['remember_token']);
    }
} 