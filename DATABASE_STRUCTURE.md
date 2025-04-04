# Structure de la Base de Données

Ce document détaille la structure de la base de données utilisée par l'application SENATOR Dashboard.

## Configuration

L'application utilise par défaut une base de données SQLite située dans le fichier:
```
database/database.sqlite
```

Il est également possible de configurer l'application pour utiliser MySQL en modifiant le fichier `.env`.

## Tables Principales

### Table `users`

Cette table stocke les informations des utilisateurs de l'application.

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

#### Champs

- `id`: Identifiant unique de l'utilisateur
- `username`: Nom d'utilisateur (unique)
- `password`: Mot de passe haché (bcrypt)
- `email`: Adresse email (unique)
- `role`: Rôle de l'utilisateur ('admin', 'manager', 'user')
- `is_active`: Indique si le compte est actif (1) ou non (0)
- `is_locked`: Indique si le compte est verrouillé (1) ou non (0)
- `failed_attempts`: Nombre de tentatives de connexion échouées
- `last_failed_attempt`: Date de la dernière tentative échouée
- `reset_token`: Jeton pour la réinitialisation du mot de passe
- `reset_token_expires_at`: Date d'expiration du jeton de réinitialisation
- `password_changed_at`: Date du dernier changement de mot de passe
- `created_at`: Date de création de l'utilisateur
- `updated_at`: Date de dernière mise à jour

### Table `access_logs`

Cette table stocke les journaux d'accès importés depuis les fichiers CSV.

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

#### Champs

- `id`: Identifiant unique de l'entrée
- `user_id`: Identifiant de l'utilisateur associé (peut être NULL)
- `ip_address`: Adresse IP liée à l'événement
- `user_agent`: User-agent du navigateur lié à l'événement
- `action`: Type d'action ('access', etc.)
- `status`: Statut de l'action ('success', 'failed', 'unknown')
- `created_at`: Date de création de l'entrée
- `event_date`: Date de l'événement d'accès
- `event_time`: Heure de l'événement d'accès
- `event_type`: Type d'événement ('Utilisateur accepté', 'Utilisateur inconnu', etc.)
- `badge_number`: Numéro de badge
- `location`: Emplacement où l'événement s'est produit
- `user_group`: Groupe auquel appartient l'utilisateur

### Table `sessions`

Cette table gère les sessions utilisateur pour l'authentification.

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

#### Champs

- `id`: Identifiant unique de la session
- `user_id`: Identifiant de l'utilisateur associé
- `token`: Jeton de session unique
- `expires_at`: Date d'expiration de la session
- `created_at`: Date de création de la session

## Relations entre les tables

- `access_logs.user_id` → `users.id`: Un log d'accès peut être associé à un utilisateur (optionnel)
- `sessions.user_id` → `users.id`: Une session est toujours associée à un utilisateur (obligatoire)

## Gestion des erreurs

### Problème connu: Colonne `failed_attempts`

Si vous rencontrez des erreurs liées à la colonne `failed_attempts` dans la table `users`, cela peut indiquer:

1. Une migration manquante (si vous passez de MySQL à SQLite)
2. Une différence de schéma entre l'environnement de développement et de production

Le code inclut des mécanismes pour traiter ces exceptions, mais il est recommandé de vérifier la structure de votre base de données si vous rencontrez des problèmes persistants.

## Extension du schéma

Pour ajouter de nouvelles tables ou colonnes, vous pouvez:

1. Créer un script SQL de migration dans le dossier `database/migrations/`
2. Utiliser les méthodes de la classe `Database` pour exécuter des instructions SQL
3. Utiliser le module d'import pour gérer des nouveaux types de données

## Notes sur SQLite vs MySQL

Il existe des différences de syntaxe entre SQLite et MySQL, notamment:

- SQLite utilise `strftime()` pour le formatage des dates, tandis que MySQL utilise `DATE_FORMAT()`
- SQLite n'a pas de type ENUM, utilisant à la place des VARCHAR avec contraintes
- SQLite ne prend pas en charge certaines fonctions avancées de MySQL comme les procédures stockées

Le code tient compte de ces différences, mais des adaptations peuvent être nécessaires pour certaines requêtes complexes. 