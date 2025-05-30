# Configuration de la Base de Données SENATOR_INVESTECH

Ce document explique comment configurer la base de données pour l'application SENATOR_INVESTECH sur une nouvelle machine.

## Prérequis

- MySQL 8.0 ou supérieur
- Node.js 18.x ou supérieur
- NPM 9.x ou supérieur

## Méthode 1: Utilisation du script automatique

1. Assurez-vous que MySQL est installé et en cours d'exécution
2. Placez les fichiers `schema_dump.sql` et `data_dump.sql` dans le même répertoire que le script
3. Exécutez le script:

```bash
./setup_database.sh
```

Le script vous demandera le mot de passe MySQL et configurera automatiquement la base de données.

## Méthode 2: Configuration manuelle

Si vous préférez configurer manuellement la base de données:

1. Créez la base de données:

```sql
CREATE DATABASE senator_investech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Importez le schéma:

```bash
mysql -u root -p senator_investech < schema_dump.sql
```

3. Importez les données:

```bash
mysql -u root -p senator_investech < data_dump.sql
```

## Méthode 3: Utilisation de Prisma

Si vous avez cloné le projet complet:

1. Assurez-vous que le fichier `.env` contient les bonnes informations de connexion:

```
DATABASE_URL="mysql://root:password@localhost:3306/senator_investech"
```

2. Exécutez la commande Prisma pour synchroniser la base de données:

```bash
npx prisma db push
```

3. Importez les données:

```bash
mysql -u root -p senator_investech < data_dump.sql
```

## Comptes par défaut

Une fois la base de données configurée, vous pouvez vous connecter avec les comptes suivants:

- Administrateur: admin@senator.com / P@ssw0rd
- Opérateur: operator@senator.com / P@ssw0rd
- Utilisateur: user@senator.com / P@ssw0rd

## Notes importantes

- Les mots de passe par défaut sont configurés pour expirer à la première connexion
- Assurez-vous de modifier les mots de passe en production
- La structure de la base de données est gérée par Prisma, ne modifiez pas manuellement les tables 