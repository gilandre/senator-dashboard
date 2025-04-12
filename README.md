# Application SENATOR Dashboard

## Description
Cette application permet de gérer les accès du personnel via un système de badges. Elle offre diverses fonctionnalités dont:
- Import de données depuis des fichiers CSV
- Visualisation des entrées/sorties via un tableau de bord
- Gestion des utilisateurs et des permissions
- Génération de rapports

## Prérequis
- PHP 7.4 ou supérieur
- MySQL 5.7 ou supérieur
- Serveur web (Apache, Nginx, etc.)
- Extensions PHP: PDO, PDO_MySQL, mbstring, json

## Installation

### 1. Configuration de l'environnement
Créez un fichier `.env` à la racine du projet en vous basant sur le modèle `.env.example`:
```
# Application
APP_NAME="SENATOR"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost
APP_KEY=base64:YourSecureKeyHere
APP_SECRET=your-secret-key-here

# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=senator_db
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
```

### 2. Création de la base de données
Exécutez le script d'initialisation de la base de données:
```
php setup_db.php
```

### 3. Configuration du schéma de la base de données
Exécutez le script de création des tables:
```
php run_schema.php
```

Si vous rencontrez des erreurs avec certaines tables, exécutez:
```
php fix_db.php
```

### 4. Création de l'utilisateur administrateur
Un utilisateur administrateur est automatiquement créé avec les identifiants suivants:
- **Nom d'utilisateur**: admin
- **Mot de passe**: password

Il est vivement recommandé de changer ce mot de passe après la première connexion.

## Utilisation

### Import de données CSV
Placez vos fichiers CSV dans le répertoire `SENATOR_INVESTECH`. Le format attendu est:
```
Badge;Nom;Prenom;Groupe;Status;Date;Heure;Evenement;Central
A12345;Dupont;Jean;ADMIN;Actif;01/01/2023;08:30;Entree;Portail Principal
```

### Connexion à l'application
1. Accédez à l'URL de l'application
2. Connectez-vous avec les identifiants administrateur
3. Vous serez redirigé vers le tableau de bord principal

### Fonctionnalités principales
- **Tableau de bord**: Visualisez les statistiques d'entrées/sorties
- **Import**: Importez de nouvelles données depuis des fichiers CSV
- **Rapports**: Générez des rapports personnalisés
- **Utilisateurs**: Gérez les utilisateurs et leurs permissions
- **Paramètres**: Configurez les options de l'application

## Structure du projet
- `/config` - Fichiers de configuration
- `/public` - Point d'entrée public de l'application
- `/src` - Code source principal
  - `/Core` - Classes fondamentales
  - `/controllers` - Contrôleurs
  - `/models` - Modèles de données
  - `/views` - Vues et templates
- `/database` - Migrations et seeds pour la base de données
- `/SENATOR_INVESTECH` - Répertoire pour les fichiers d'import CSV

## Support
Pour toute question ou problème, veuillez contacter l'équipe de support à support@senator-investech.com. 