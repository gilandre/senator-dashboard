<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class Session extends Model
{
    // Nom de la table associée
    protected static $table = 'sessions';
    
    // Propriétés du modèle correspondant aux colonnes de la table
    public $id;
    public $user_id;
    public $token;
    public $expires_at;
    public $created_at;
    
    /**
     * Crée une nouvelle session pour un utilisateur
     */
    public static function create(int $userId): self
    {
        $session = new self();
        $session->user_id = $userId;
        $session->token = bin2hex(random_bytes(32));
        $session->expires_at = date('Y-m-d H:i:s', strtotime('+2 hours'));
        $session->created_at = date('Y-m-d H:i:s');
        
        $session->save();
        return $session;
    }
    
    /**
     * Trouve une session par son token
     */
    public static function findByToken(string $token): ?self
    {
        return self::queryOne(
            "SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()",
            [$token]
        );
    }
    
    /**
     * Supprime une session
     */
    public static function deleteByToken(string $token): bool
    {
        return self::execute(
            "DELETE FROM sessions WHERE token = ?",
            [$token]
        ) > 0;
    }
    
    /**
     * Supprime toutes les sessions d'un utilisateur
     */
    public static function deleteByUserId(int $userId): int
    {
        return self::execute(
            "DELETE FROM sessions WHERE user_id = ?",
            [$userId]
        );
    }
    
    /**
     * Supprime les sessions expirées
     */
    public static function deleteExpired(): int
    {
        return self::execute(
            "DELETE FROM sessions WHERE expires_at < NOW()"
        );
    }
    
    /**
     * Prolonge une session existante
     */
    public static function extend(string $token, int $minutes = 120): bool
    {
        return self::execute(
            "UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE token = ?",
            [$minutes, $token]
        ) > 0;
    }
    
    /**
     * Récupère toutes les sessions actives d'un utilisateur
     */
    public static function getActiveForUser(int $userId): array
    {
        return self::query(
            "SELECT * FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC",
            [$userId]
        );
    }
} 