<?php

namespace App\Database\Migrations;

use App\Core\Database;

class Migration20240403AddResetTokenColumns
{
    public function up()
    {
        $db = Database::getInstance();
        
        // Ajouter la colonne reset_token
        $db->query("
            ALTER TABLE users
            ADD COLUMN reset_token VARCHAR(255) NULL,
            ADD COLUMN reset_token_expires_at DATETIME NULL,
            ADD COLUMN password_changed_at DATETIME NULL
        ");
    }

    public function down()
    {
        $db = Database::getInstance();
        
        // Supprimer les colonnes ajoutées
        $db->query("
            ALTER TABLE users
            DROP COLUMN reset_token,
            DROP COLUMN reset_token_expires_at,
            DROP COLUMN password_changed_at
        ");
    }
} 