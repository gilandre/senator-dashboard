# SENATOR INVESTECH

Application de gestion de contrôle d'accès utilisant Next.js, Prisma et MySQL.

## Prérequis

- Node.js 18+
- MySQL 8+
- npm ou yarn

## Configuration

### Fichier .env

L'application utilise un fichier `.env` pour la configuration. Voici un exemple de fichier `.env` :

```
# Configuration du serveur
PORT=3010

# Configuration de la base de données MySQL
DATABASE_URL="mysql://utilisateur:mot_de_passe@localhost:3306/senator_db"

# Configuration de l'application
NODE_ENV="development"
APP_URL="http://localhost:3010"
```

Si le fichier `.env` n'existe pas, il sera créé automatiquement avec des valeurs par défaut lors du premier démarrage de l'application avec `npm run start:env`.

### Base de données

Assurez-vous que votre base de données MySQL est créée et accessible avec les identifiants configurés dans le fichier `.env`.

Pour initialiser la base de données :

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

## Démarrage de l'application

### Avec les variables d'environnement du fichier .env

```bash
npm run start:env
```

Cette commande chargera les variables d'environnement depuis le fichier `.env` et démarrera l'application sur le port configuré (par défaut 3010).

### Développement manuel

```bash
npm run dev
```

Cette commande démarrera l'application en mode développement en utilisant le port spécifié dans la variable d'environnement PORT, ou sur le port 3010 par défaut.

### Production

```bash
npm run build
npm run start
```

Ces commandes compileront l'application pour la production et la démarreront sur le port spécifié dans la variable d'environnement PORT, ou sur le port 3010 par défaut.

## Maintenance

### Protection des configurations

Le fichier `.env` contient des informations sensibles et des configurations importantes. Il est automatiquement exclu du contrôle de version avec `.gitignore`. 

Pour modifier les paramètres de l'application, modifiez directement ce fichier sans passer par un script ou un outil automatisé.

### Migration de MongoDB vers MySQL

Cette application a été migrée de MongoDB vers MySQL/Prisma. Pour plus d'informations sur la migration, consultez le document `docs/mongodb-mysql-migration.md`.

## Licence

Copyright © 2023-2024 SENATOR INVESTECH. Tous droits réservés. 