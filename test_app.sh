#!/bin/bash

# Variables
BASE_URL="http://localhost:8000"
COOKIE_FILE="cookies.txt"
USERNAME="admin"
PASSWORD="admin123"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour l'affichage
print_header() {
    echo -e "\n${BLUE}===== $1 =====${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Supprimer le fichier de cookies s'il existe
rm -f $COOKIE_FILE

# 1. Test de connexion
print_header "Test de connexion"

# Récupérer le formulaire de login et extraire le token CSRF
RESPONSE=$(curl -s -c $COOKIE_FILE "$BASE_URL/login")
echo "Récupération du formulaire de login..."

# Tenter la connexion
LOGIN_RESULT=$(curl -s -b $COOKIE_FILE -c $COOKIE_FILE -X POST "$BASE_URL/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

# Vérifier si la connexion a réussi (redirection vers /dashboard)
if [[ "$LOGIN_RESULT" == *"Dashboard"* ]] || [[ "$LOGIN_RESULT" == *"Tableau de bord"* ]]; then
    print_success "Connexion réussie"
else
    print_error "Échec de connexion"
    exit 1
fi

# 2. Test du dashboard
print_header "Test du Dashboard"
DASHBOARD_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/dashboard")

if [[ "$DASHBOARD_RESULT" == *"Total Personnes"* ]] && [[ "$DASHBOARD_RESULT" == *"Tendances Hebdomadaires"* ]]; then
    print_success "Dashboard chargé correctement"
else
    print_error "Échec du chargement du dashboard"
fi

# 3. Test de l'interface d'import
print_header "Test de l'Import"
IMPORT_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/import")

if [[ "$IMPORT_RESULT" == *"Import de données"* ]] && [[ "$IMPORT_RESULT" == *"Importer un fichier"* ]]; then
    print_success "Interface d'import chargée correctement"
else
    print_error "Échec du chargement de l'import"
fi

# 4. Test de la liste des rapports
print_header "Test de la liste des Rapports"
REPORTS_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/reports")

if [[ "$REPORTS_RESULT" == *"Liste des rapports"* ]] && [[ "$REPORTS_RESULT" == *"Nouveau rapport"* ]]; then
    print_success "Liste des rapports chargée correctement"
else
    print_error "Échec du chargement de la liste des rapports"
fi

# 5. Test de l'interface de création de rapport
print_header "Test de la création de Rapport"
CREATE_REPORT_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/reports/create")

if [[ "$CREATE_REPORT_RESULT" == *"Nouveau rapport"* ]] && [[ "$CREATE_REPORT_RESULT" == *"Type de rapport"* ]]; then
    print_success "Interface de création de rapport chargée correctement"
else
    print_error "Échec du chargement de l'interface de création de rapport"
fi

# 6. Créer un rapport (POST)
print_header "Création d'un rapport"
CREATION_RESULT=$(curl -s -b $COOKIE_FILE -c $COOKIE_FILE -X POST "$BASE_URL/reports/create" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "title=Rapport de test&type=daily&description=Ceci est un rapport de test&start_date=$(date +'%Y-%m-%d')&end_date=$(date -d '+1 week' +'%Y-%m-%d')&include_charts=on&include_tables=on")

# Vérifier si la création a réussi (redirection vers /reports)
if [[ "$CREATION_RESULT" == *"Liste des rapports"* ]]; then
    print_success "Création de rapport réussie"
else
    print_error "Échec de la création du rapport"
fi

# 7. Test d'un rapport existant (supposons que le rapport avec ID=1 existe)
print_header "Consultation d'un rapport"
REPORT_ID=1
VIEW_REPORT_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/reports/$REPORT_ID")

if [[ "$VIEW_REPORT_RESULT" == *"Détails du rapport"* ]]; then
    print_success "Visualisation du rapport réussie"
else
    print_error "Échec de la visualisation du rapport"
fi

# 8. Test d'édition d'un rapport
print_header "Édition d'un rapport"
EDIT_REPORT_RESULT=$(curl -s -b $COOKIE_FILE "$BASE_URL/reports/$REPORT_ID/edit")

if [[ "$EDIT_REPORT_RESULT" == *"Modifier le rapport"* ]]; then
    print_success "Interface d'édition du rapport chargée correctement"
else
    print_error "Échec du chargement de l'interface d'édition"
fi

# 9. Test de déconnexion
print_header "Test de déconnexion"
LOGOUT_RESULT=$(curl -s -b $COOKIE_FILE -c $COOKIE_FILE "$BASE_URL/logout")

# Vérifier si la déconnexion a réussi (redirection vers /login)
if [[ "$LOGOUT_RESULT" == *"Connexion"* ]] || [[ "$LOGOUT_RESULT" == *"Login"* ]]; then
    print_success "Déconnexion réussie"
else
    print_error "Échec de la déconnexion"
fi

# Nettoyage
rm -f $COOKIE_FILE

print_header "Tests terminés"
echo "Les tests ont vérifié le layout commun et les fonctionnalités principales de l'application." 