<?php

namespace App\Services;

use PDO;
use PDOException;
use RuntimeException;
use App\Core\Database;
use App\Core\Session;

class ConfigService
{
    private static ?ConfigService $instance = null;
    private array $settings = [];
    private PDO $db;

    private function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->loadSettings();
    }

    /**
     * Singleton pattern pour obtenir l'instance
     */
    public static function getInstance(): ConfigService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Charge tous les paramètres depuis la base de données
     */
    private function loadSettings(): void
    {
        try {
            $stmt = $this->db->query("SELECT setting_key, setting_value FROM settings");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($results as $row) {
                $this->settings[$row['setting_key']] = $row['setting_value'];
            }
        } catch (PDOException $e) {
            // Si la table n'existe pas encore, on ne fait rien
            error_log("Erreur lors du chargement des paramètres: " . $e->getMessage());
        }
    }

    /**
     * Obtient la valeur d'un paramètre
     * 
     * @param string $key Clé du paramètre
     * @param mixed $default Valeur par défaut si le paramètre n'existe pas
     * @return mixed Valeur du paramètre
     */
    public function get(string $key, $default = null)
    {
        return $this->settings[$key] ?? $default;
    }

    /**
     * Définit la valeur d'un paramètre
     * 
     * @param string $key Clé du paramètre
     * @param mixed $value Valeur du paramètre
     * @param string|null $description Description du paramètre
     * @param bool $isPublic Si le paramètre est public ou non
     * @return bool True si l'opération a réussi
     */
    public function set(string $key, $value, ?string $description = null, bool $isPublic = true): bool
    {
        try {
            // Vérifier si le paramètre existe déjà
            $stmt = $this->db->prepare("SELECT id FROM settings WHERE setting_key = :key");
            $stmt->execute(['key' => $key]);
            
            if ($stmt->fetch()) {
                // Mise à jour d'un paramètre existant
                $stmt = $this->db->prepare("
                    UPDATE settings 
                    SET setting_value = :value, 
                        description = COALESCE(:description, description),
                        is_public = :is_public,
                        created_at = CURRENT_TIMESTAMP
                    WHERE setting_key = :key
                ");
                
                $result = $stmt->execute([
                    'key' => $key,
                    'value' => $value,
                    'description' => $description,
                    'is_public' => $isPublic ? 1 : 0
                ]);
            } else {
                // Création d'un nouveau paramètre
                $stmt = $this->db->prepare("
                    INSERT INTO settings (setting_key, setting_value, description, is_public)
                    VALUES (:key, :value, :description, :is_public)
                ");
                
                $result = $stmt->execute([
                    'key' => $key,
                    'value' => $value,
                    'description' => $description,
                    'is_public' => $isPublic ? 1 : 0
                ]);
            }
            
            // Mettre à jour le cache en mémoire
            if ($result) {
                $this->settings[$key] = $value;
            }
            
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors de la sauvegarde du paramètre {$key}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Supprime un paramètre
     * 
     * @param string $key Clé du paramètre
     * @return bool True si l'opération a réussi
     */
    public function delete(string $key): bool
    {
        try {
            $stmt = $this->db->prepare("DELETE FROM settings WHERE setting_key = :key");
            $result = $stmt->execute(['key' => $key]);
            
            if ($result && isset($this->settings[$key])) {
                unset($this->settings[$key]);
            }
            
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors de la suppression du paramètre {$key}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtient tous les paramètres
     * 
     * @param bool $publicOnly Si true, ne retourne que les paramètres publics
     * @return array Tableau associatif des paramètres
     */
    public function getAll(bool $publicOnly = false): array
    {
        if (!$publicOnly) {
            return $this->settings;
        }
        
        try {
            $stmt = $this->db->query("SELECT setting_key, setting_value FROM settings WHERE is_public = 1");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $publicSettings = [];
            foreach ($results as $row) {
                $publicSettings[$row['setting_key']] = $row['setting_value'];
            }
            
            return $publicSettings;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des paramètres publics: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Retourne l'heure de début de journée de travail
     * 
     * @return string Heure de début au format HH:MM:SS
     */
    public function getWorkDayStartTime(): string
    {
        return $this->get('work_day_start_time', '09:00:00');
    }

    /**
     * Retourne l'heure de fin de journée de travail
     * 
     * @return string Heure de fin au format HH:MM:SS
     */
    public function getWorkDayEndTime(): string
    {
        return $this->get('work_day_end_time', '18:00:00');
    }

    /**
     * Définit l'heure de début de journée de travail
     * 
     * @param string $time Heure au format HH:MM ou HH:MM:SS
     * @return bool True si l'opération a réussi
     */
    public function setWorkDayStartTime(string $time): bool
    {
        // Valider le format de l'heure
        if (!$this->validateTimeFormat($time)) {
            return false;
        }
        
        // Assurer le format HH:MM:SS
        if (strlen($time) === 5) {
            $time .= ':00';
        }
        
        return $this->set('work_day_start_time', $time, 'Heure de début de la journée de travail', true);
    }

    /**
     * Définit l'heure de fin de journée de travail
     * 
     * @param string $time Heure au format HH:MM ou HH:MM:SS
     * @return bool True si l'opération a réussi
     */
    public function setWorkDayEndTime(string $time): bool
    {
        // Valider le format de l'heure
        if (!$this->validateTimeFormat($time)) {
            return false;
        }
        
        // Assurer le format HH:MM:SS
        if (strlen($time) === 5) {
            $time .= ':00';
        }
        
        return $this->set('work_day_end_time', $time, 'Heure de fin de la journée de travail', true);
    }

    /**
     * Valide le format de l'heure
     * 
     * @param string $time Heure à valider
     * @return bool True si le format est valide
     */
    private function validateTimeFormat(string $time): bool
    {
        return (bool) preg_match('/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/', $time);
    }
} 