# Migration de MongoDB vers Prisma/MySQL

## Étapes réalisées

1. Conversion de l'API `attendance_config` pour utiliser le modèle Prisma `attendance_parameters` au lieu de MongoDB
   - Mise à jour de GET et PUT pour utiliser les fonctions prisma
   - Adaptation des noms de champs en snake_case pour correspondre à la convention MySQL

2. Ajout des champs manquants dans le modèle `holidays`
   - Ajout des champs `type` et `repeats_yearly` au schéma Prisma
   - Application de la migration avec `prisma migrate dev`

## Étapes restantes

1. Convertir toutes les APIs qui utilisent encore MongoDB:
   - src/app/api/profiles/
   - src/app/api/permissions/
   - src/app/api/users/
   - src/app/api/security/
   - src/app/api/auth/
   - src/app/api/user-activities/

2. Mettre à jour ou supprimer les anciens modèles MongoDB:
   - src/models/AccessRecord.ts
   - src/models/SecuritySettings.ts 
   - src/models/User.ts
   - src/models/Permission.ts
   - etc.

3. Remplacer les services de connexion MongoDB:
   - src/lib/mongodb.ts
   - src/lib/database.ts

## Recommandations

1. Approche progressive:
   - Convertir les APIs une par une, en commençant par les plus critiques
   - Tester chaque API après conversion
   - Adapter les schémas Prisma au besoin

2. Uniformisation des conventions:
   - Prisma utilise snake_case pour les noms de champs en base de données
   - Maintenir camelCase pour les réponses d'API

3. Documentation:
   - Documenter les différences entre l'ancien et le nouveau modèle
   - Mettre à jour toute documentation d'API

4. Nettoyage:
   - Une fois la migration complète, supprimer les fichiers MongoDB obsolètes 