# Installation via Git

Cette documentation explique comment installer et configurer le projet SENATOR Dashboard à partir du dépôt Git.

## Prérequis

- Git
- PHP 8.1 ou supérieur
- Composer
- SQLite (par défaut) ou MySQL (optionnel)

## Étapes d'installation

1. Cloner le dépôt Git

```bash
git clone <URL_DU_DEPOT> senator-dashboard
cd senator-dashboard
```

2. Installer les dépendances via Composer

```bash
composer install
```

3. Créer le fichier d'environnement

```bash
cp .env.example .env
```

4. Configurer votre fichier .env

Modifiez le fichier .env selon vos besoins. Par défaut, le projet utilise SQLite.

5. Préparer la base de données

Si vous utilisez SQLite, créez le fichier de base de données:

```bash
touch database/database.sqlite
sqlite3 database/database.sqlite < database/sqlite_schema.sql
```

Si vous préférez MySQL:
- Créez une base de données
- Mettez à jour votre fichier .env avec les détails de connexion MySQL
- Importez le schéma SQL: `mysql -u username -p database_name < database/schema.sql`

6. Ajouter l'utilisateur administrateur par défaut

```bash
sqlite3 database/database.sqlite "INSERT INTO users (username, email, password, role, is_active) VALUES ('admin', 'admin@example.com', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1);"
```

7. Démarrer le serveur de développement

```bash
php -S localhost:8000 -t public/
```

8. Accéder à l'application

Ouvrez votre navigateur et accédez à http://localhost:8000

Les identifiants par défaut sont:
- Utilisateur: `admin`
- Mot de passe: `password`

## Structure des branches Git

- `main` : Version stable de production
- `develop` : Branche de développement
- `feature/*` : Branches pour les nouvelles fonctionnalités

## Workflow de développement

1. Créer une branche pour votre fonctionnalité
```bash
git checkout -b feature/nom-de-la-fonctionnalite
```

2. Travailler sur votre fonctionnalité et commiter régulièrement

3. Pousser votre branche sur le dépôt distant
```bash
git push origin feature/nom-de-la-fonctionnalite
```

4. Créer une Pull Request pour fusionner votre fonctionnalité dans `develop`

## Import de données de test

Pour importer des données de test depuis un fichier CSV:

```bash
php import_access_logs.php
```

Le fichier CSV doit être préalablement placé à la racine du projet sous le nom "Exportation 12.csv". 