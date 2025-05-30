#!/bin/bash

echo "🧹 Nettoyage complet..."
# Tuer tous les processus Node en cours
killall node 2>/dev/null

# Supprimer tous les caches
rm -rf .next
rm -rf node_modules/.cache

echo "⚙️ Vérification des dépendances..."
npm install

echo "🚀 Démarrage du serveur..."
npm run dev 