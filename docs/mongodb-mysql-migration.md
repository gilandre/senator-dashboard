# Guide de migration de MongoDB vers MySQL (Prisma)

Ce document décrit le processus de migration de l'application SENATOR_INVESTECH de MongoDB vers MySQL en utilisant Prisma comme ORM.

## Contexte

L'application utilisait initialement MongoDB comme base de données principale. Pour des raisons de performances, de cohérence des données et de facilité de maintenance, nous avons décidé de migrer vers MySQL en utilisant Prisma comme ORM.

## État actuel de la migration

- [x] Schéma Prisma configuré et opérationnel
- [x] Route d'authentification migrée vers Prisma
- [ ] Migration des données existantes de MongoDB vers MySQL
- [ ] Vérification et tests des fonctionnalités migrées
- [ ] Suppression des références à MongoDB

## Étapes pour compléter la migration

### 1. Arrêt du serveur et sauvegarde des données

Avant de procéder à la migration complète, arrêtez le serveur et effectuez une sauvegarde de la base de données MongoDB.

```bash
# Sauvegarde de la base de données MongoDB
mongodump --uri="mongodb://localhost:27017/senatorDb" --out=./mongo-backup-$(date +%Y%m%d)
```

### 2. Exécution du script de migration

Exécutez le script de migration pour transférer les données de MongoDB vers MySQL.

```bash
node scripts/migrate-mongodb-to-mysql.js
```

### 3. Vérification des données migrées

Vérifiez que les données ont été correctement migrées en exécutant des requêtes sur la base de données MySQL.

```bash
npx prisma studio
```

### 4. Suppression des références à MongoDB

Les fichiers suivants contiennent encore des références à MongoDB qui doivent être modifiées pour utiliser Prisma à la place :

- Tous les fichiers du répertoire `src/models/`
- Les routes API utilisant connectToDatabase() et les modèles MongoDB
- Les scripts d'initialisation et de seeding

Pour chaque fichier, suivez le modèle d'implémentation utilisé dans `/src/app/api/auth/login/route.ts`.

### 5. Migration des routes API restantes

Pour chaque route API utilisant MongoDB, modifiez le code pour utiliser Prisma. Exemple :

#### Avant (MongoDB)
```typescript
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await connectToDatabase();
  const users = await User.find({});
  return Response.json({ users });
}
```

#### Après (Prisma)
```typescript
import { prisma } from '@/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json({ users });
}
```

### 6. Tests et validation

Après avoir migré toutes les routes :

1. Exécutez les tests automatisés
2. Testez manuellement toutes les fonctionnalités principales
3. Vérifiez les journaux pour s'assurer qu'il n'y a pas d'avertissements liés à MongoDB

### 7. Nettoyage final

Après avoir validé que tout fonctionne correctement, vous pouvez :

1. Supprimer les fichiers de modèles MongoDB (`src/models/`)
2. Supprimer `src/lib/mongodb.ts` (ou le conserver comme stub de compatibilité)
3. Supprimer les dépendances MongoDB du `package.json`

```bash
npm uninstall mongoose mongodb
```

4. Mettre à jour la documentation de l'application

## Problèmes connus et solutions

### Format des IDs

MongoDB utilise des ObjectIDs (24 caractères hexadécimaux), tandis que MySQL utilise des entiers auto-incrémentés. Si votre application stocke des IDs dans des cookies ou des jetons, assurez-vous de mettre à jour la logique correspondante.

### Relations entre les données

MongoDB étant une base de données NoSQL, certaines relations peuvent être imbriquées. Dans MySQL, ces relations doivent être exprimées via des clés étrangères. Assurez-vous que le schéma Prisma reflète correctement ces relations.

### Incompatibilités de champs

Certains champs peuvent avoir des noms ou des types différents entre les deux systèmes. Référez-vous au schéma Prisma pour connaître les noms de champs corrects à utiliser lors de la migration des routes API. 