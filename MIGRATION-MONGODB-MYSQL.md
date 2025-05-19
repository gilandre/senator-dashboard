# Guide de migration de MongoDB vers MySQL

Ce document décrit le processus de migration de la base de données MongoDB vers MySQL pour l'application Senator InvesTech. Il fournit des instructions étape par étape, des considérations techniques et des exemples de code.

## Table des matières

1. [Prérequis](#prérequis)
2. [Différences conceptuelles entre MongoDB et MySQL](#différences-conceptuelles)
3. [Schéma de base de données MySQL](#schéma-de-base-de-données)
4. [Couche d'abstraction de données](#couche-dabstraction-de-données)
5. [Migration des données](#migration-des-données)
6. [Adaptation des requêtes](#adaptation-des-requêtes)
7. [Test et validation](#test-et-validation)
8. [Mise en production](#mise-en-production)

## Prérequis

- MySQL 8.0+ installé et configuré
- Node.js 18+ installé
- Accès à la base de données MongoDB existante
- Permissions d'administrateur sur les deux bases de données

## Différences conceptuelles

### MongoDB vs MySQL

| MongoDB | MySQL |
|---------|-------|
| Document-oriented | Table-oriented |
| Schéma flexible | Schéma strict |
| Collections | Tables |
| Documents (JSON/BSON) | Enregistrements (lignes) |
| Champs nichés | Relations entre tables |
| _id autogénéré | Auto-increment ou clés primaires définies |
| Requêtes NoSQL | Requêtes SQL |

### Principales différences d'implémentation

1. **Structure des données**
   - MongoDB : Documents JSON avec des champs nichés
   - MySQL : Tables relationnelles avec clés étrangères

2. **Requêtes**
   - MongoDB : API basée sur des méthodes comme `find()`, `insertMany()`
   - MySQL : Langage SQL standard

3. **Indexation**
   - MongoDB : Indexation flexible sur n'importe quel champ
   - MySQL : Index sur colonnes spécifiques

## Schéma de base de données

Le schéma MySQL pour cette application est structuré comme suit :

### Tables principales

- `users` : Utilisateurs du système
- `profiles` : Profils de sécurité
- `permissions` : Permissions individuelles
- `profile_permissions` : Table de jointure entre profils et permissions
- `user_profiles` : Table de jointure entre utilisateurs et profils
- `employees` : Employés
- `visitors` : Visiteurs
- `access_logs` : Journaux d'accès
- `anomalies` : Anomalies détectées
- `security_settings` : Paramètres de sécurité
- `attendance_config` : Configuration d'assiduité
- `holidays` : Jours fériés
- `sessions` : Sessions utilisateur
- `csv_imports` : Historique d'importation CSV
- `audit_logs` : Journal d'audit pour les actions système

Le script complet de création du schéma se trouve dans le fichier `mysql-schema.sql`.

## Couche d'abstraction de données

Nous avons créé une couche d'abstraction dans `src/lib/mysql.js` qui imite l'API MongoDB pour faciliter la transition. Cette couche fournit des méthodes similaires à celles de MongoDB :

- `find()`
- `findOne()`
- `insertOne()`
- `insertMany()`
- `updateOne()`
- `deleteOne()`
- `deleteMany()`

### Exemple d'utilisation :

```javascript
const db = require('./lib/mysql');

// Connexion
await db.connect();

// Recherche
const users = await db.find('users', { role: 'admin' });

// Insertion
const result = await db.insertOne('employees', {
  badge_number: 'E123',
  first_name: 'Jean',
  last_name: 'Dupont',
  department: 'IT'
});

// Mise à jour
await db.updateOne('access_logs', 
  { id: 42 }, 
  { processed: true }
);
```

## Migration des données

### Étapes de migration des données

1. **Création du schéma MySQL**
   ```bash
   mysql -u root -p < mysql-schema.sql
   ```

2. **Exécution du script de migration**
   ```bash
   node migrate-mongo-to-mysql.js
   ```
   
   Ou, si MongoDB n'est pas accessible directement :
   
   ```bash
   node seed-mysql-data.js
   ```

3. **Vérification des données**
   ```bash
   mysql -u root -p senator_investech -e "SELECT COUNT(*) FROM access_logs"
   ```

### Notes sur la migration

- Les identifiants MongoDB (`_id`) sont convertis en clés primaires auto-incrémentées dans MySQL
- Les documents nichés sont transformés en tables liées
- Les dates sont converties dans un format compatible avec MySQL
- Les tableaux sont généralement convertis en tables de jointure

## Adaptation des requêtes

### Requêtes MongoDB vs Requêtes MySQL

#### Exemple : Recherche simple

**MongoDB :**
```javascript
const users = await db.collection('users').find({ role: 'admin' }).toArray();
```

**MySQL adapté :**
```javascript
const users = await db.find('users', { role: 'admin' });
```

**MySQL natif :**
```javascript
const [users] = await connection.execute('SELECT * FROM users WHERE role = ?', ['admin']);
```

#### Exemple : Agrégation

**MongoDB :**
```javascript
const stats = await db.collection('access_logs').aggregate([
  { $match: { personType: 'employee' } },
  { $group: { _id: '$eventType', count: { $sum: 1 } } }
]).toArray();
```

**MySQL adapté :**
```javascript
const stats = await db.query(`
  SELECT event_type, COUNT(*) as count 
  FROM access_logs 
  WHERE person_type = ? 
  GROUP BY event_type
`, ['employee']);
```

## Test et validation

### Tests unitaires

Exécutez les tests unitaires adaptés pour MySQL :

```bash
npm run test:mysql
```

### Validation manuelle

1. Vérifiez les comptages d'enregistrements entre MongoDB et MySQL
2. Validez l'intégrité des données migrées
3. Testez les fonctionnalités principales de l'application avec la nouvelle base de données

## Mise en production

### Étapes de déploiement

1. **Sauvegarde des deux bases de données**
   ```bash
   # MongoDB
   mongodump --uri="mongodb+srv://user:password@cluster" --out=backup
   
   # MySQL
   mysqldump -u root -p senator_investech > mysql_backup.sql
   ```

2. **Mise à jour de la configuration d'application**
   Modifiez le fichier `.env` pour utiliser MySQL :
   ```
   # Remplacer
   MONGODB_URI=mongodb+srv://...
   
   # Par
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=
   MYSQL_DATABASE=senator_investech
   ```

3. **Déploiement avec temps d'arrêt minimum**
   - Activez le mode maintenance
   - Déployez les changements
   - Vérifiez le fonctionnement
   - Désactivez le mode maintenance

### Surveillance post-déploiement

Surveillez attentivement :
- Performance des requêtes
- Utilisation des ressources serveur
- Journaux d'erreurs
- Expérience utilisateur

## Conclusion

Cette migration offre plusieurs avantages :
- Structure de données plus rigide et cohérente
- Meilleure intégration avec d'autres systèmes via SQL
- Performances potentiellement meilleures pour les jointures complexes
- Écosystème SQL mature avec de nombreux outils d'analyse

Cependant, certains compromis ont été faits :
- Perte de la flexibilité du schéma
- Transformation des requêtes plus complexes
- Nécessité de gérer les migrations de schéma

Pour toute question ou problème, contactez l'équipe technique à support@senator-investech.com 