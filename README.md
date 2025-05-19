# SENATOR INVESTECH

Application de gestion de contrôle d'accès utilisant Next.js, Prisma et MySQL.

## Prérequis

- Node.js 18+
- MySQL 8+
- npm ou yarn

## Configuration

### Fichier .env

L'application utilise un fichier `.env` pour la configuration. Voici un exemple de fichier `.env` :

```env
# Configuration du serveur
PORT=3010

# Configuration de la base de données MySQL
DATABASE_URL="mysql://utilisateur:mot_de_passe@localhost:3306/SENATOR_INVESTECH"

# Configuration de l'application
NODE_ENV="development"
APP_URL="http://localhost:3010"

# Configuration de l'authentification
NEXTAUTH_URL="http://localhost:3010"
NEXTAUTH_SECRET="votre_secret_ici"

# Configuration des emails (optionnel)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASSWORD="password"
SMTP_FROM="noreply@senator.com"
```

### Base de données

1. Créez la base de données MySQL :
```sql
CREATE DATABASE SENATOR_INVESTECH CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Initialisez la base de données avec Prisma :
```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev --name init

# Charger les données initiales
npm run db:seed
```

Les données initiales incluent :
- Un compte administrateur (admin@senator.com / Admin@123)
- Un compte utilisateur standard (user@senator.com / User@123)
- Les permissions de base
- Les paramètres de sécurité par défaut
- La configuration des horaires de travail
- Les jours fériés de base

## Démarrage de l'application

### Développement

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev
```

L'application sera accessible sur http://localhost:3010

### Production

```bash
# Installation des dépendances
npm install

# Construction de l'application
npm run build

# Démarrage en production
npm run start
```

## Fonctionnalités principales

- Gestion des accès (employés et visiteurs)
- Suivi des présences
- Gestion des rapports
- Export des données (Excel, CSV)
- Gestion des utilisateurs et des permissions
- Configuration des horaires de travail
- Gestion des jours fériés

## Maintenance

### Mise à jour de la base de données

Pour appliquer de nouvelles migrations :
```bash
npx prisma migrate deploy
```

Pour mettre à jour le schéma de la base de données :
```bash
npx prisma db push
```

### Scripts utilitaires

- `npm run db:seed` : Réinitialise la base de données avec les données initiales
- `npm run create-admin` : Crée un nouvel administrateur
- `npm run reset-passwords` : Réinitialise les mots de passe des utilisateurs

### Sécurité

- Les mots de passe sont hachés avec bcrypt
- Les sessions utilisent JWT avec rotation des tokens
- Protection CSRF activée
- Validation des entrées utilisateur
- Journalisation des incidents de sécurité

## Support

Pour toute question ou assistance, contactez l'équipe de support à support@senator.com

## Licence

Copyright © 2023-2024 SENATOR INVESTECH. Tous droits réservés. 