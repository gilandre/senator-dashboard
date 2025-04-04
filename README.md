# SENATOR Dashboard

Application web de tableau de bord pour l'analyse des données de contrôle d'accès SENATOR.

## Fonctionnalités

- Import de fichiers CSV de données de contrôle d'accès
- Visualisation des données sous forme de tableaux de bord
- Génération de rapports d'événements d'accès
- Gestion des utilisateurs et des droits d'accès
- Interface responsive et moderne

## Prérequis

- PHP 8.1 ou supérieur
- SQLite (par défaut) ou MySQL (optionnel)
- Composer
- Serveur web (Apache/Nginx) ou serveur PHP intégré

## Installation

1. Cloner le repository :
```bash
git clone https://github.com/votre-organisation/senator-dashboard.git
cd senator-dashboard
```

2. Installer les dépendances :
```bash
composer install
```

3. Créer le fichier .env à partir du modèle :
```bash
cp .env.example .env
```

4. Configurer les variables d'environnement dans le fichier .env :
```env
APP_NAME="SENATOR Dashboard"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# Configuration de la base de données
# Par défaut, le projet utilise SQLite
DB_CONNECTION=sqlite
# Si vous souhaitez utiliser MySQL, décommentez les lignes suivantes:
# DB_CONNECTION=mysql
# DB_HOST=localhost
# DB_DATABASE=senator_db
# DB_USERNAME=votre_utilisateur
# DB_PASSWORD=votre_mot_de_passe
```

5. Démarrer le serveur intégré de PHP :
```bash
php -S localhost:8000 -t public/
```

## Structure de la base de données

Le projet utilise par défaut une base de données SQLite située dans `database/database.sqlite`. La base de données contient les tables suivantes:

### Table `users`
Stocke les informations des utilisateurs du système.
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username VARCHAR(50) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL, 
    email VARCHAR(100) NOT NULL UNIQUE, 
    role VARCHAR(10) NOT NULL DEFAULT 'user', 
    is_active INTEGER NOT NULL DEFAULT 1, 
    is_locked INTEGER NOT NULL DEFAULT 0, 
    failed_attempts INTEGER DEFAULT 0, 
    last_failed_attempt DATETIME, 
    reset_token VARCHAR(100), 
    reset_token_expires_at DATETIME, 
    password_changed_at DATETIME, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table `access_logs`
Stocke les journaux d'accès importés depuis les fichiers CSV.
```sql
CREATE TABLE access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    ip_address VARCHAR(45), 
    user_agent TEXT, 
    action VARCHAR(50) NOT NULL, 
    status VARCHAR(20) NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    event_date DATE, 
    event_time TIME, 
    event_type VARCHAR(50), 
    badge_number VARCHAR(50), 
    location VARCHAR(100), 
    user_group VARCHAR(50), 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Table `sessions`
Gère les sessions utilisateur pour l'authentification.
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER NOT NULL, 
    token VARCHAR(255) NOT NULL UNIQUE, 
    expires_at DATETIME NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Structure du projet

```
senator-dashboard/
├── database/         # Fichier SQLite et scripts SQL
├── public/           # Fichiers publics et point d'entrée
├── src/              # Code source de l'application
│   ├── Core/         # Classes de base et utilitaires
│   ├── controllers/  # Contrôleurs de l'application
│   ├── models/       # Modèles de données
│   ├── views/        # Vues de l'application
│   ├── Services/     # Services métier
│   ├── Middleware/   # Middleware pour les requêtes
│   ├── config/       # Fichiers de configuration
│   └── routes/       # Configuration des routes
├── tests/            # Tests unitaires et fonctionnels
└── vendor/           # Dépendances (généré par Composer)
```

## Import des données

1. Préparer un fichier CSV avec le format attendu (séparateur `;`)
2. Se connecter à l'application avec un compte administrateur
3. Accéder à la section "Import"
4. Téléverser le fichier CSV
5. Vérifier les données importées dans le tableau de bord

Le script `import_access_logs.php` à la racine du projet peut également être utilisé pour l'import en ligne de commande:
```bash
php import_access_logs.php
```

## Format du fichier CSV

Le fichier CSV doit contenir les colonnes suivantes (séparées par des points-virgules) :

1. Numéro de badge
2. Date évènements (format JJ/MM/AAAA)
3. Heure évènements (format HH:MM:SS)
4. Centrale 
5. Lecteur (location)
6. Nature Evenement (event_type)
7. Nom
8. Prénom
9. Statut
10. Groupe (user_group)

## Accès par défaut

L'application inclut un compte administrateur par défaut :
- Nom d'utilisateur: `admin`
- Mot de passe: `password`

Il est recommandé de changer ce mot de passe après la première connexion.

## Problèmes connus et dépannage

### Colonne `failed_attempts` manquante

Si vous rencontrez des erreurs de type `Column not found: 1054 Unknown column 'failed_attempts'`, cela peut être dû à une incompatibilité entre le schéma de base de données et le code. La solution est implémentée dans le code pour gérer cette exception.

### SQLite vs MySQL

Le code est compatible avec SQLite et MySQL, mais certaines fonctions SQL peuvent différer. En cas d'erreur, vérifiez la syntaxe SQL utilisée dans les requêtes.

### Authentification

Si vous rencontrez des problèmes d'authentification, vérifiez:
1. L'état de la session PHP
2. Les permissions des fichiers de base de données
3. Les logs d'erreur PHP

## Développement

Pour contribuer au développement:

1. Forker le repository
2. Créer une branche pour votre fonctionnalité
3. Implémenter et tester vos modifications
4. Soumettre une pull request 