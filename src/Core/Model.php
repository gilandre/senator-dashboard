<?php

namespace App\Core;

abstract class Model
{
    /**
     * Nom de la table associée au modèle
     */
    protected static $table;
    
    /**
     * Instance de la base de données
     */
    protected static function getDB()
    {
        return Database::getInstance();
    }
    
    /**
     * Exécute une requête et retourne tous les résultats
     */
    protected static function query(string $sql, array $params = []): array
    {
        $stmt = self::getDB()->query($sql, $params);
        $results = $stmt->fetchAll(\PDO::FETCH_CLASS, get_called_class());
        
        return $results ?: [];
    }
    
    /**
     * Exécute une requête et retourne un seul résultat
     */
    protected static function queryOne(string $sql, array $params = []): ?self
    {
        $stmt = self::getDB()->query($sql, $params);
        $stmt->setFetchMode(\PDO::FETCH_CLASS, get_called_class());
        $result = $stmt->fetch();
        
        return $result ?: null;
    }
    
    /**
     * Exécute une requête sans retourner de résultats
     */
    protected static function execute(string $sql, array $params = []): int
    {
        $stmt = self::getDB()->query($sql, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Trouve un enregistrement par son ID
     */
    public static function findById(int $id): ?self
    {
        $sql = "SELECT * FROM " . static::$table . " WHERE id = ?";
        return self::queryOne($sql, [$id]);
    }
    
    /**
     * Trouve tous les enregistrements
     */
    public static function findAll(): array
    {
        $sql = "SELECT * FROM " . static::$table;
        return self::query($sql);
    }
    
    /**
     * Sauvegarde le modèle (insertion ou mise à jour)
     */
    public function save(): bool
    {
        if (isset($this->id) && $this->id) {
            return $this->update();
        }
        
        return $this->insert();
    }
    
    /**
     * Insère un nouvel enregistrement
     */
    protected function insert(): bool
    {
        $properties = get_object_vars($this);
        $columns = [];
        $values = [];
        $placeholders = [];
        
        foreach ($properties as $property => $value) {
            if ($property !== 'id' && !str_starts_with($property, '_')) {
                $columns[] = $property;
                $values[] = $value;
                $placeholders[] = '?';
            }
        }
        
        $sql = "INSERT INTO " . static::$table . " (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
        
        $result = self::execute($sql, $values);
        
        if ($result) {
            $this->id = self::getDB()->getConnection()->lastInsertId();
            return true;
        }
        
        return false;
    }
    
    /**
     * Met à jour un enregistrement existant
     */
    protected function update(): bool
    {
        $properties = get_object_vars($this);
        $columns = [];
        $values = [];
        
        foreach ($properties as $property => $value) {
            if ($property !== 'id' && !str_starts_with($property, '_')) {
                $columns[] = "$property = ?";
                $values[] = $value;
            }
        }
        
        $values[] = $this->id;
        
        $sql = "UPDATE " . static::$table . " SET " . implode(', ', $columns) . " WHERE id = ?";
        
        return self::execute($sql, $values) > 0;
    }
    
    /**
     * Supprime un enregistrement
     */
    public function delete(): bool
    {
        if (!isset($this->id)) {
            return false;
        }
        
        $sql = "DELETE FROM " . static::$table . " WHERE id = ?";
        return self::execute($sql, [$this->id]) > 0;
    }
    
    /**
     * Supprime un enregistrement par son ID
     */
    public static function deleteById(int $id): bool
    {
        $sql = "DELETE FROM " . static::$table . " WHERE id = ?";
        return self::execute($sql, [$id]) > 0;
    }
    
    /**
     * Compte tous les enregistrements
     */
    public static function count(): int
    {
        $sql = "SELECT COUNT(*) as count FROM " . static::$table;
        $result = self::getDB()->query($sql)->fetch();
        return $result ? (int)$result['count'] : 0;
    }
} 