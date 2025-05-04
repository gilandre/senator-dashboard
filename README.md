# SenatorFX Dashboard

## Description
Ce dashboard permet d'analyser les données d'accès des employés d'une banque en Côte d'Ivoire, extraites du logiciel SENATOR FX. L'application permet d'importer des fichiers CSV, de visualiser les temps de présence et de générer des rapports RH personnalisés.

## Fonctionnalités
- Import de fichiers CSV extraits de SENATOR FX
- Visualisation des heures d'arrivée et de départ (jour/semaine/mois)
- Calcul des durées de travail par employé
- Gestion des jours fériés et journées continues
- Rapports personnalisés pour les RH
- Export des données au format Excel/PDF

## Stack Technique
- **Frontend**: Next.js 14 (App Router)
- **Styling**: TailwindCSS, Shadcn/UI
- **Charts**: Recharts
- **Base de données**: MongoDB
- **ORM**: Mongoose
- **Authentification**: NextAuth.js

## Installation

### Prérequis
- Node.js 18+ et npm
- MongoDB (local ou distant)

### Étapes d'installation
1. Cloner le repository:
   ```bash
   git clone https://github.com/votre-username/senatorfx-dashboard.git
   cd senatorfx-dashboard
   ```

2. Installer les dépendances:
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement:
   ```bash
   cp .env.local.example .env.local
   ```
   Puis modifier le fichier `.env.local` avec vos paramètres

4. Lancer le serveur de développement:
   ```bash
   npm run dev
   ```

5. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Architecture
```
src/
├── app/                    # Routes Next.js (App Router)
│   ├── api/                # API routes
│   ├── dashboard/          # Dashboard principal
│   ├── employees/          # Gestion des employés
│   ├── import/             # Import des données
│   ├── reports/            # Rapports personnalisés
│   └── settings/           # Paramètres (jours fériés, etc.)
├── components/             # Composants réutilisables
│   ├── ui/                 # Composants UI génériques
│   ├── dashboard/          # Composants spécifiques au dashboard  
│   ├── charts/             # Graphiques et visualisations
│   └── forms/              # Formulaires
├── lib/                    # Fonctions utilitaires et configuration
│   ├── db/                 # Configuration de la base de données
│   ├── csv-parser/         # Parseur de fichiers CSV
│   └── utils/              # Fonctions utilitaires
├── models/                 # Modèles Mongoose
└── types/                  # Types TypeScript
```

## Déploiement
L'application peut être déployée:
- En ligne (Vercel, AWS, etc.)
- On-premise (Docker, serveur Node.js)

## Utilisation
1. Aller sur la page d'importation
2. Télécharger les fichiers CSV depuis SENATOR FX
3. Importer les fichiers
4. Visualiser les données et rapports dans le dashboard

## License
MIT 

## Instructions pour les favicons

Pour compléter l'installation des favicons, veuillez générer les fichiers d'icônes suivants :

1. `/public/favicon/favicon.ico` - Icône principale (16x16, 32x32, 48x48)
2. `/public/favicon/apple-touch-icon.png` - Icône Apple (180x180)
3. `/public/favicon/android-chrome-192x192.png` - Icône Android (192x192)
4. `/public/favicon/android-chrome-512x512.png` - Icône Android (512x512)

Vous pouvez utiliser le fichier `/public/favicon/icon.svg` comme base pour générer ces icônes. Plusieurs services en ligne permettent de générer facilement des favicons à partir d'un fichier SVG, comme :

- [Favicon Generator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

## Lancement du serveur de développement

```bash
npm run dev
```

## Compilation pour la production

```bash
npm run build
```

## Lancement en production

```bash
npm start
``` 