const mysql = require('mysql2/promise');

// Configuration de la connexion MySQL
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'senator_investech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de connexions MySQL
let pool = null;

/**
 * Initialise la connexion à MySQL
 */
async function connect() {
  try {
    if (!pool) {
      pool = mysql.createPool(MYSQL_CONFIG);
      console.log('Connecté à MySQL');
    }
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
 * Recherche des enregistrements dans une table
 */
async function find(table, filters = {}, options = {}) {
  const whereClause = Object.keys(filters).length > 0
    ? 'WHERE ' + Object.entries(filters)
        .map(([key, value]) => `${key} = ?`)
        .join(' AND ')
    : '';
  
  const params = Object.values(filters);
  
  let sql = `SELECT * FROM ${table} ${whereClause}`;
  
  if (options.sort) {
    const sortClauses = Object.entries(options.sort).map(([key, value]) => {
      const direction = value === 1 ? 'ASC' : 'DESC';
      return `${key} ${direction}`;
    });
    
    if (sortClauses.length > 0) {
      sql += ` ORDER BY ${sortClauses.join(', ')}`;
    }
  }
  
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  if (options.offset || options.skip) {
    sql += ` OFFSET ?`;
    params.push(options.offset || options.skip);
  }
  
  return await query(sql, params);
}

/**
 * Recherche un enregistrement dans une table
 */
async function findOne(table, filters = {}) {
  const results = await find(table, filters, { limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Insère un enregistrement dans une table
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
 * Insère plusieurs enregistrements dans une table
 */
async function insertMany(table, dataArray) {
  if (dataArray.length === 0) {
    return { insertIds: [], affectedRows: 0 };
  }

  const columns = Object.keys(dataArray[0]).join(', ');
  const placeholders = dataArray.map(() => 
    `(${Object.keys(dataArray[0]).map(() => '?').join(', ')})`
  ).join(', ');
  
  const values = dataArray.flatMap(data => Object.values(data));
  
  const sql = `INSERT INTO ${table} (${columns}) VALUES ${placeholders}`;
  const result = await query(sql, values);
  
  return {
    insertIds: result.map(r => r.insertId),
    affectedRows: result.reduce((sum, r) => sum + r.affectedRows, 0)
  };
}

/**
 * Met à jour un enregistrement dans une table
 */
async function updateOne(table, filters, updates) {
  const whereClause = Object.keys(filters).length > 0
    ? 'WHERE ' + Object.entries(filters)
        .map(([key, value]) => `${key} = ?`)
        .join(' AND ')
    : '';
  
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const params = [
    ...Object.values(updates),
    ...Object.values(filters)
  ];
  
  const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
  const result = await query(sql, params);
  
  return { affectedRows: result.affectedRows };
}

/**
 * Supprime un enregistrement d'une table
 */
async function deleteOne(table, filters) {
  const whereClause = Object.keys(filters).length > 0
    ? 'WHERE ' + Object.entries(filters)
        .map(([key, value]) => `${key} = ?`)
        .join(' AND ')
    : '';
  
  const params = Object.values(filters);
  
  const sql = `DELETE FROM ${table} ${whereClause}`;
  const result = await query(sql, params);
  
  return { affectedRows: result.affectedRows };
}

/**
 * Supprime plusieurs enregistrements d'une table
 */
async function deleteMany(table, filters) {
  return deleteOne(table, filters);
}

/**
 * Vérifie l'existence d'enregistrements dans une table
 */
async function exists(table, filters) {
  const whereClause = Object.keys(filters).length > 0
    ? 'WHERE ' + Object.entries(filters)
        .map(([key, value]) => `${key} = ?`)
        .join(' AND ')
    : '';
  
  const params = Object.values(filters);
  
  const sql = `SELECT EXISTS(SELECT 1 FROM ${table} ${whereClause}) as exists`;
  const result = await query(sql, params);
  
  return result[0].exists === 1;
}

module.exports = {
  connect,
  query,
  transaction,
  find,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  deleteOne,
  deleteMany,
  exists
}; 