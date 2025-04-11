#!/bin/bash
COOKIE_FILE="import_cookies.txt"
BASE_URL="http://localhost:8000"
echo "Étape 1: Connexion..."
curl -s -c $COOKIE_FILE -d "username=admin&password=password" -H "Content-Type: application/x-www-form-urlencoded" "$BASE_URL/login" > /dev/null
