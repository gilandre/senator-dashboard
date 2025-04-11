<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class AuditLog extends Model
{
    // Nom de la table associée
    protected static $table = 'audit_logs';
    
    // Propriétés du modèle correspondant aux colonnes de la table
    public $id;
    public $user_id;
    public $action;
    public $table_name;
    public $record_id;
    public $old_value;
    public $new_value;
    public $created_at;
    
    /**
     * Enregistre une action d'audit
     */
    public static function log(string $action, string $tableName, ?int $recordId = null, ?array $oldValue = null, ?array $newValue = null): int
    {
        $auditLog = new self();
        $auditLog->user_id = $_SESSION['user_id'] ?? null;
        $auditLog->action = $action;
        $auditLog->table_name = $tableName;
        $auditLog->record_id = $recordId;
        $auditLog->old_value = $oldValue ? json_encode($oldValue) : null;
        $auditLog->new_value = $newValue ? json_encode($newValue) : null;
        $auditLog->created_at = date('Y-m-d H:i:s');
        
        $auditLog->save();
        return $auditLog->id;
    }
    
    /**
     * Récupère les logs d'audit pour une table et un enregistrement spécifique
     */
    public static function getForRecord(string $tableName, int $recordId): array
    {
        return self::query(
            "SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? ORDER BY created_at DESC",
            [$tableName, $recordId]
        );
    }
    
    /**
     * Récupère les logs d'audit pour un utilisateur spécifique
     */
    public static function getForUser(int $userId, int $limit = 100): array
    {
        return self::query(
            "SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            [$userId, $limit]
        );
    }
    
    /**
     * Récupère les derniers logs d'audit
     */
    public static function getRecent(int $limit = 100): array
    {
        return self::query(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
            [$limit]
        );
    }
    
    /**
     * Récupère les logs d'audit pour une action spécifique
     */
    public static function getByAction(string $action, int $limit = 100): array
    {
        return self::query(
            "SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?",
            [$action, $limit]
        );
    }
    
    /**
     * Supprime les logs d'audit antérieurs à une date spécifiée
     */
    public static function purgeOlderThan(string $date): int
    {
        return self::execute(
            "DELETE FROM audit_logs WHERE created_at < ?",
            [$date]
        );
    }
} 