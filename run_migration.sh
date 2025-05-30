#!/bin/bash

# Récupération des informations de connexion à partir du fichier .env
if [ -f .env ]; then
  # Extraire les informations de connexion du DATABASE_URL
  DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
  
  # Analyser l'URL pour extraire les informations
  DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  echo "Informations de connexion extraites de .env:"
  echo "Hôte: $DB_HOST"
  echo "Port: $DB_PORT"
  echo "Base de données: $DB_NAME"
  echo "Utilisateur: $DB_USER"
  
  # Exécution de la migration
  echo "Exécution de la migration..."
  mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < prisma/migrations/manual/migration_drop_role_enum.sql
  
  if [ $? -eq 0 ]; then
    echo "Migration exécutée avec succès!"
  else
    echo "Erreur lors de l'exécution de la migration."
  fi
else
  echo "Fichier .env non trouvé!"
  exit 1
fi 