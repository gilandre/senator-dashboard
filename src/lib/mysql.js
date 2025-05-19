const mysql = require('mysql2/promise');

// Configuration de la connexion MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de connexions MySQL
let pool;

/**
 * Initialise la connexion à MySQL
 */
async function connect() {
  try {
    pool = mysql.createPool(MYSQL_CONFIG);
    console.log('Connecté à MySQL');
    return pool;
  } catch (error) {
    console.error('Erreur de connexion à MySQL:', error);
    throw error;
  }
}

/**
 * Récupère une instance du pool de connexions
 */
function getPool() {
  if (!pool) {
    throw new Error('MySQL non initialisé - appeler connect() d\'abord');
  }
  return pool;
}

/**
 * Exécute une requête MySQL
 * @param {string} sql - La requête SQL
 * @param {Array} params - Les paramètres de la requête
 * @returns {Promise<Array>} - Les résultats de la requête
 */
async function query(sql, params = []) {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
}

/**
 * Exécute une transaction MySQL
 * @param {Function} callback - La fonction à exécuter dans la transaction
 * @returns {Promise<any>} - Le résultat de la transaction
 */
async function transaction(callback) {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Convertit un objet de filtres en clause WHERE SQL
 * @param {Object} filters - Les filtres à appliquer
 * @returns {Object} - La clause WHERE et les paramètres
 */
function buildWhereClause(filters) {
  const clauses = [];
  const params = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      clauses.push(`${key} IS NULL`);
    } else if (typeof value === 'object' && value.$in) {
      // Gestion des opérateurs $in
      const placeholders = value.$in.map(() => '?').join(', ');
      clauses.push(`${key} IN (${placeholders})`);
      params.push(...value.$in);
    } else if (typeof value === 'object' && value.$regex) {
      // Gestion des opérateurs $regex
      clauses.push(`${key} LIKE ?`);
      params.push(`%${value.$regex.source}%`);
    } else if (typeof value === 'object' && (value.$gt || value.$gte || value.$lt || value.$lte)) {
      // Gestion des opérateurs de comparaison
      if (value.$gt) {
        clauses.push(`${key} > ?`);
        params.push(value.$gt);
      }
      if (value.$gte) {
        clauses.push(`${key} >= ?`);
        params.push(value.$gte);
      }
      if (value.$lt) {
        clauses.push(`${key} < ?`);
        params.push(value.$lt);
      }
      if (value.$lte) {
        clauses.push(`${key} <= ?`);
        params.push(value.$lte);
      }
    } else {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Imite la fonction find de MongoDB pour MySQL
 * @param {string} table - La table à interroger
 * @param {Object} filters - Les filtres à appliquer
 * @param {Object} options - Les options de la requête (tri, limite, etc.)
 * @returns {Promise<Array>} - Les résultats de la requête
 */
async function find(table, filters = {}, options = {}) {
  const { whereClause, params } = buildWhereClause(filters);
  
  let sql = `SELECT * FROM ${table} ${whereClause}`;
  
  // Gestion du tri
  if (options.sort) {
    const sortClauses = Object.entries(options.sort).map(([key, value]) => {
      const direction = value === 1 ? 'ASC' : 'DESC';
      return `${key} ${direction}`;
    });
    
    if (sortClauses.length > 0) {
      sql += ` ORDER BY ${sortClauses.join(', ')}`;
    }
  }
  
  // Gestion de la limite
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  // Gestion de l'offset
  if (options.offset || options.skip) {
    sql += ` OFFSET ?`;
    params.push(options.offset || options.skip);
  }
  
  return await query(sql, params);
}

/**
 * Imite la fonction findOne de MongoDB pour MySQL
 * @param {string} table - La table à interroger
 * @param {Object} filters - Les filtres à appliquer
 * @returns {Promise<Object>} - Le premier résultat de la requête
 */
async function findOne(table, filters = {}) {
  const results = await find(table, filters, { limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Imite la fonction insertOne de MongoDB pour MySQL
 * @param {string} table - La table où insérer
 * @param {Object} data - Les données à insérer
 * @returns {Promise<Object>} - Les informations sur l'insertion
 */
async function insertOne(table, data) {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  
  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const result = await query(sql, values);
  
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows
  };
}

/**
 * Imite la fonction insertMany de MongoDB pour MySQL
 * @param {string} table - La table où insérer
 * @param {Array<Object>} data - Les données à insérer
 * @returns {Promise<Object>} - Les informations sur l'insertion
 */
async function insertMany(table, dataArray) {
  if (dataArray.length === 0) {
    return { insertIds: [], affectedRows: 0 };
  }
  
  return await transaction(async (connection) => {
    const insertIds = [];
    let totalAffectedRows = 0;
    
    for (const data of dataArray) {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      const [result] = await connection.execute(sql, values);
      
      insertIds.push(result.insertId);
      totalAffectedRows += result.affectedRows;
    }
    
    return {
      insertIds,
      affectedRows: totalAffectedRows
    };
  });
}

/**
 * Imite la fonction updateOne de MongoDB pour MySQL
 * @param {string} table - La table à mettre à jour
 * @param {Object} filters - Les filtres pour sélectionner l'enregistrement
 * @param {Object} updates - Les mises à jour à appliquer
 * @returns {Promise<Object>} - Les informations sur la mise à jour
 */
async function updateOne(table, filters, updates) {
  const { whereClause, params: whereParams } = buildWhereClause(filters);
  
  if (!whereClause) {
    throw new Error('Aucun filtre spécifié pour la mise à jour');
  }
  
  // Extraire les mises à jour
  let updateData = updates;
  if (updates.$set) {
    updateData = updates.$set;
  }
  
  const setClauses = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
  const updateParams = Object.values(updateData);
  
  const sql = `UPDATE ${table} SET ${setClauses} ${whereClause}`;
  const allParams = [...updateParams, ...whereParams];
  
  const result = await query(sql, allParams);
  
  return {
    matchedCount: result.affectedRows,
    modifiedCount: result.changedRows
  };
}

/**
 * Imite la fonction deleteOne de MongoDB pour MySQL
 * @param {string} table - La table où supprimer
 * @param {Object} filters - Les filtres pour sélectionner l'enregistrement
 * @returns {Promise<Object>} - Les informations sur la suppression
 */
async function deleteOne(table, filters) {
  const { whereClause, params } = buildWhereClause(filters);
  
  if (!whereClause) {
    throw new Error('Aucun filtre spécifié pour la suppression');
  }
  
  const sql = `DELETE FROM ${table} ${whereClause} LIMIT 1`;
  const result = await query(sql, params);
  
  return {
    deletedCount: result.affectedRows
  };
}

/**
 * Imite la fonction deleteMany de MongoDB pour MySQL
 * @param {string} table - La table où supprimer
 * @param {Object} filters - Les filtres pour sélectionner les enregistrements
 * @returns {Promise<Object>} - Les informations sur la suppression
 */
async function deleteMany(table, filters) {
  const { whereClause, params } = buildWhereClause(filters);
  
  if (!whereClause) {
    throw new Error('Aucun filtre spécifié pour la suppression');
  }
  
  const sql = `DELETE FROM ${table} ${whereClause}`;
  const result = await query(sql, params);
  
  return {
    deletedCount: result.affectedRows
  };
}

/**
 * Convertit un nom de modèle MongoDB en nom de table MySQL
 * @param {string} modelName - Le nom du modèle MongoDB
 * @returns {string} - Le nom de la table MySQL
 */
function getTableName(modelName) {
  // Convertit "AccessLog" en "access_logs", "Employee" en "employees", etc.
  return modelName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .substring(1) + 's';
}

/**
 * Vérifie si un enregistrement existe déjà
 * @param {string} table - La table à vérifier
 * @param {Object} filters - Les filtres pour trouver l'enregistrement
 * @returns {Promise<boolean>} - True si l'enregistrement existe
 */
async function exists(table, filters) {
  const result = await findOne(table, filters);
  return result !== null;
}

module.exports = {
  connect,
  getPool,
  query,
  transaction,
  find,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  deleteOne,
  deleteMany,
  getTableName,
  exists
}; 