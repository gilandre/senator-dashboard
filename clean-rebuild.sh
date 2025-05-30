#!/bin/bash

echo "🧹 Nettoyage de l'environnement..."
# Arrêter tous les processus node
killall node 2>/dev/null
# Supprimer le dossier .next
rm -rf .next
# Supprimer le cache de node_modules
rm -rf node_modules/.cache

echo "🔄 Mise à jour des dépendances..."
npm install

echo "🚀 Démarrage de l'application..."
npm run dev 