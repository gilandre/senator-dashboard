# Guide du Développeur

Ce document est destiné aux développeurs qui rejoignent le projet SENATOR Dashboard. Il fournit des informations sur l'architecture de l'application, les principaux composants et les pratiques de développement.

## Architecture

L'application suit une architecture MVC (Modèle-Vue-Contrôleur) personnalisée:

```
 ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
 │  Controller │ ──── │   Service    │ ──── │    Model    │
 └─────────────┘      └──────────────┘      └─────────────┘
        │                     │                    │
        │                     │                    │
        ▼                     ▼                    ▼
 ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
 │    View     │      │  Middleware  │      │  Database   │
 └─────────────┘      └──────────────┘      └─────────────┘
```

### Composants Principaux

1. **Controller**: Gère les requêtes HTTP et coordonne les actions
2. **Model**: Représente les entités de données et leur logique
3. **View**: Génère l'interface utilisateur
4. **Service**: Contient la logique métier
5. **Middleware**: Traite les requêtes avant qu'elles n'atteignent le contrôleur
6. **Database**: Couche d'abstraction pour l'accès à la base de données

## Point d'Entrée

Le point d'entrée de l'application est `public/index.php`. Ce fichier initialise l'environnement, configure les routes et lance l'application.

## Flux d'Exécution

1. Une requête arrive à `public/index.php`
2. Le Router analyse l'URL et détermine le contrôleur à exécuter
3. Les middlewares sont exécutés (authentification, validation, etc.)
4. Le contrôleur appelle les services nécessaires
5. Les services interagissent avec les modèles
6. Les modèles accèdent à la base de données via la classe Database
7. Le contrôleur charge la vue appropriée
8. La vue est rendue et envoyée au client

## Dossiers Clés

- `src/Core/`: Classes fondamentales du framework
- `src/controllers/`: Contrôleurs de l'application
- `src/models/`: Modèles représentant les entités
- `src/views/`: Templates d'interface utilisateur
- `src/Services/`: Services contenant la logique métier
- `src/Middleware/`: Middlewares de traitement des requêtes
- `public/`: Ressources accessibles publiquement

## Services Principaux

### DashboardService

Le `DashboardService` est responsable de la récupération et de l'analyse des données pour le tableau de bord. Il inclut des méthodes pour:

- Récupérer les statistiques quotidiennes
- Calculer les statistiques hebdomadaires
- Identifier les emplacements les plus fréquentés
- Analyser les pics d'utilisation

### AuthService

Le `AuthService` gère l'authentification des utilisateurs, avec:

- Vérification des informations d'identification
- Gestion des sessions
- Contrôle des tentatives de connexion échouées
- Réinitialisation des mots de passe

### ImportService

Le `ImportService` est chargé de l'importation des données à partir de fichiers CSV:

- Validation des fichiers d'entrée
- Conversion des données
- Insertion dans la base de données
- Journalisation des résultats d'importation

## Base de Données

La classe `Database` (dans `src/Core/Database.php`) implémente le pattern Singleton et fournit des méthodes pour:

- Établir la connexion à la base de données
- Exécuter des requêtes SQL préparées
- Récupérer des résultats
- Gérer les transactions

Par défaut, l'application utilise SQLite, mais elle peut être configurée pour utiliser MySQL.

## Authentification et Autorisation

Le système d'authentification est basé sur:

1. Sessions PHP pour gérer l'état de connexion
2. Table `users` pour stocker les informations d'utilisateur
3. Table `sessions` pour les sessions persistantes

Le système d'autorisation est basé sur les rôles (`role` dans la table `users`).

## Journalisation

La journalisation est effectuée via la fonction `error_log()` de PHP. Les messages sont généralement stockés dans:

- `php_error.log` à la racine du projet

## Tests et Débogage

Pour exécuter les tests:
```bash
./vendor/bin/phpunit
```

Pour le débogage:
1. Activer le mode debug dans `.env`: `APP_DEBUG=true`
2. Utiliser `error_log()` pour enregistrer des informations
3. Vérifier les logs dans `php_error.log`

## Ajout de Fonctionnalités

Pour ajouter une nouvelle fonctionnalité:

1. Créer ou modifier un modèle dans `src/models/`
2. Implémenter la logique métier dans un service dans `src/Services/`
3. Créer un contrôleur dans `src/controllers/`
4. Ajouter les vues dans `src/views/`
5. Définir les routes dans `src/routes/`

## Conventions de Code

- Utiliser le PSR-4 pour l'autoloading
- Suivre PSR-12 pour le style de code
- Utiliser le camelCase pour les méthodes et les variables
- Utiliser PascalCase pour les classes
- Utiliser snake_case pour les tables et les colonnes de la base de données

## Gestion des Erreurs

Le code utilise des exceptions pour gérer les erreurs. Les types d'exceptions courants sont:

- `PDOException` pour les erreurs de base de données
- `RuntimeException` pour les erreurs d'exécution
- `InvalidArgumentException` pour les arguments invalides

Les exceptions sont généralement capturées au niveau du contrôleur ou du service, journalisées, puis présentées à l'utilisateur sous forme de message d'erreur.

## Ressources

- Documentation PHP: https://www.php.net/docs.php
- Documentation SQLite: https://www.sqlite.org/docs.html
- PSR-12: https://www.php-fig.org/psr/psr-12/

---

N'hésitez pas à contribuer à cette documentation si vous découvrez de nouvelles informations ou si vous souhaitez clarifier certains points. 