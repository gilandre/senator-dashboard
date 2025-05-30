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

# Système d'export de données

## Vue d'ensemble

Le système d'export de données permet aux utilisateurs d'exporter des informations depuis diverses parties de l'application dans différents formats (Excel, CSV, PDF). Il est conçu pour être robuste, performant et gérer efficacement les grands volumes de données.

## Caractéristiques principales

- Support de multiples formats (Excel, CSV, PDF)
- Analyse préalable des données pour informer l'utilisateur
- Division automatique des fichiers volumineux
- Compression ZIP pour les exports multi-fichiers
- Gestion des contraintes spécifiques à chaque format
- Interface utilisateur unifiée via le composant ExportDialog
- APIs d'export spécifiques pour chaque module

## Architecture

### Composants clés

1. **ExportDialog** (`src/components/ui/export-dialog.tsx`)
   - Composant d'interface utilisateur réutilisable pour tous les exports
   - Analyse les données avant export
   - Affiche les informations et recommandations à l'utilisateur
   - Gère les options d'export (division, en-têtes, etc.)

2. **ExportService** (`src/lib/services/export-service.ts`)
   - Service central pour l'analyse et l'export des données
   - Définit les limites de chaque format
   - Gère la division des fichiers et la création d'archives ZIP
   - Fournit des fonctions utilitaires pour les différents formats

3. **APIs d'export** (`src/app/api/export/...`)
   - Route principale d'export (`/api/export`)
   - Routes spécifiques par module (anomalies, rapports, etc.)
   - Gestion des permissions et authentification
   - Journalisation des activités d'export

### Flux de données

1. L'utilisateur déclenche un export via un composant spécifique (ex: AnomalyExportMenu)
2. ExportDialog affiche l'interface et envoie une requête d'analyse
3. L'API d'analyse évalue le volume de données et renvoie des recommandations
4. L'utilisateur confirme l'export avec les options choisies
5. L'API d'export génère le(s) fichier(s) demandé(s)
6. Le(s) fichier(s) est/sont téléchargé(s) par le navigateur

## Limites et contraintes

- Excel: 1 million de lignes maximum par fichier
- CSV: 1,5 million de lignes maximum par fichier
- PDF: 5 000 lignes maximum pour des raisons de performance
- Les exports très volumineux (>10M lignes) sont mis en file d'attente pour traitement asynchrone

## Extension du système

### Ajouter un nouveau module d'export

1. Créer une nouvelle API d'export spécifique dans `src/app/api/export/[nouveau-module]/route.ts`
2. Implémenter les fonctions de génération de fichier pour chaque format supporté
3. Ajouter un composant menu d'export dans le module concerné
4. Utiliser ExportDialog avec les paramètres appropriés

### Ajouter un nouveau format d'export

1. Ajouter une nouvelle entrée dans `FORMAT_LIMITS` dans export-service.ts
2. Implémenter une fonction de génération pour ce format
3. Ajouter la gestion du format dans les APIs d'export
4. Mettre à jour l'interface utilisateur pour proposer ce format

## Maintenance et dépannage

### Journalisation

Le système utilise une journalisation détaillée pour faciliter le dépannage:
- Les événements d'export sont préfixés par `[EXPORT]`
- Les événements spécifiques aux anomalies sont préfixés par `[EXPORT_ANOMALIES]`
- Les durées d'exécution sont enregistrées pour aider à identifier les goulots d'étranglement

### Résolution des problèmes courants

- **Erreur "Module not found"**: Vérifier que toutes les dépendances sont installées (jspdf, jspdf-autotable, etc.)
- **Timeout lors de l'export**: Augmenter `maxDuration` dans la configuration de l'API
- **Erreurs de mémoire**: Réduire la taille des lots traités simultanément ou implémenter un traitement en streaming

## Dépendances

- ExcelJS: Génération de fichiers Excel
- jsPDF: Génération de fichiers PDF
- jspdf-autotable: Tableaux pour les PDF
- archiver: Compression ZIP pour les exports volumineux 