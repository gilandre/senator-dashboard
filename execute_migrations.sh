#!/bin/bash

# Extraire les informations de connexion du fichier .env
if [ ! -f .env ]; then
  echo "Fichier .env introuvable!"
  exit 1
fi

# Extraire l'URL de la base de données
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

# Extraire les composants de l'URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Connexion à la base de données..."
echo "Hôte: $DB_HOST"
echo "Port: $DB_PORT"
echo "Base de données: $DB_NAME"
echo "Utilisateur: $DB_USER"

# Exécuter la première partie (synchronisation des rôles)
echo "Exécution de la première partie: synchronisation des rôles"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME <<EOF
$(cat prisma/migrations/manual/part1_sync_roles.sql)
EOF

if [ $? -eq 0 ]; then
  echo "Première partie exécutée avec succès!"
else
  echo "Erreur lors de l'exécution de la première partie."
  exit 1
fi

# Exécuter la deuxième partie (triggers)
echo "Exécution de la deuxième partie: création des triggers"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME <<EOF
$(cat prisma/migrations/manual/part2_triggers.sql)
EOF

if [ $? -eq 0 ]; then
  echo "Deuxième partie exécutée avec succès!"
else
  echo "Erreur lors de l'exécution de la deuxième partie."
  exit 1
fi

echo "Migration complète exécutée avec succès!"

# Vérification des triggers
echo "Vérification des triggers créés:"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TRIGGERS LIKE 'sync_%';"

# Vérification de la synchronisation des rôles
echo "Vérification de la synchronisation des rôles:"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME <<EOF
SELECT u.id, u.name, u.email, u.role, u.role_id, r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.id LIMIT 5;
EOF 