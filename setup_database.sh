#!/bin/bash

# Variables à configurer
DB_NAME="senator_investech"
DB_USER="root"
DB_PASS=""  # Laisser vide pour une invite de mot de passe

# Création de la base de données
echo "Création de la base de données $DB_NAME..."
mysql -u $DB_USER $([ -n "$DB_PASS" ] && echo "-p$DB_PASS" || echo "-p") -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Application du schéma
echo "Application du schéma..."
mysql -u $DB_USER $([ -n "$DB_PASS" ] && echo "-p$DB_PASS" || echo "-p") $DB_NAME < schema_dump.sql

# Import des données
echo "Import des données de test..."
mysql -u $DB_USER $([ -n "$DB_PASS" ] && echo "-p$DB_PASS" || echo "-p") $DB_NAME < data_dump.sql

echo "Base de données configurée avec succès!" 