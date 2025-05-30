import mysql from 'mysql2/promise';

// Types pour la configuration
interface MySQLConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

// Types pour les options de requête
interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  offset?: number;
  skip?: number;
}

// Types pour les filtres
interface FilterOperators {
  $in?: any[];
  $regex?: RegExp;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
}

type FilterValue = any | FilterOperators;
type Filters = Record<string, FilterValue>;

// Configuration de la connexion MySQL
const MYSQL_CONFIG: MySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'senator_investech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de connexions MySQL
let pool: mysql.Pool | null = null;

/**
 * Initialise la connexion à MySQL
 */
export async function connect(): Promise<mysql.Pool> {
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
function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('MySQL non initialisé - appeler connect() d\'abord');
  }
  return pool;
}

/**
 * Exécute une requête MySQL
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T[];
  } finally {
    connection.release();
  }
}

/**
 * Exécute une transaction MySQL
 */
export async function transaction<T>(
  callback: (connection: mysql.Connection) => Promise<T>
): Promise<T> {
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
 */
function buildWhereClause(filters: Filters): { whereClause: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      clauses.push(`${key} IS NULL`);
    } else if (typeof value === 'object' && '$in' in value) {
      const placeholders = value.$in!.map(() => '?').join(', ');
      clauses.push(`${key} IN (${placeholders})`);
      params.push(...value.$in!);
    } else if (typeof value === 'object' && '$regex' in value) {
      clauses.push(`${key} LIKE ?`);
      params.push(`%${value.$regex!.source}%`);
    } else if (typeof value === 'object' && ('$gt' in value || '$gte' in value || '$lt' in value || '$lte' in value)) {
      if ('$gt' in value) {
        clauses.push(`${key} > ?`);
        params.push(value.$gt);
      }
      if ('$gte' in value) {
        clauses.push(`${key} >= ?`);
        params.push(value.$gte);
      }
      if ('$lt' in value) {
        clauses.push(`${key} < ?`);
        params.push(value.$lt);
      }
      if ('$lte' in value) {
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
 * Recherche des enregistrements dans une table
 */
export async function find<T = any>(
  table: string,
  filters: Filters = {},
  options: QueryOptions = {}
): Promise<T[]> {
  const { whereClause, params } = buildWhereClause(filters);
  
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
  
  return await query<T>(sql, params);
}

/**
 * Recherche un enregistrement dans une table
 */
export async function findOne<T = any>(
  table: string,
  filters: Filters = {}
): Promise<T | null> {
  const results = await find<T>(table, filters, { limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Insère un enregistrement dans une table
 */
export async function insertOne<T = any>(
  table: string,
  data: Partial<T>
): Promise<{ insertId: number; affectedRows: number }> {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  
  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const result = await query<{ insertId: number; affectedRows: number }>(sql, values);
  
  return {
    insertId: result[0].insertId,
    affectedRows: result[0].affectedRows
  };
}

/**
 * Insère plusieurs enregistrements dans une table
 */
export async function insertMany<T = any>(
  table: string,
  dataArray: Partial<T>[]
): Promise<{ insertIds: number[]; affectedRows: number }> {
  if (dataArray.length === 0) {
    return { insertIds: [], affectedRows: 0 };
  }

  const columns = Object.keys(dataArray[0]).join(', ');
  const placeholders = dataArray.map(() => 
    `(${Object.keys(dataArray[0]).map(() => '?').join(', ')})`
  ).join(', ');
  
  const values = dataArray.flatMap(data => Object.values(data));
  
  const sql = `INSERT INTO ${table} (${columns}) VALUES ${placeholders}`;
  const result = await query<{ insertId: number; affectedRows: number }>(sql, values);
  
  return {
    insertIds: result.map(r => r.insertId),
    affectedRows: result.reduce((sum, r) => sum + r.affectedRows, 0)
  };
}

/**
 * Met à jour un enregistrement dans une table
 */
export async function updateOne<T = any>(
  table: string,
  filters: Filters,
  updates: Partial<T>
): Promise<{ affectedRows: number }> {
  const { whereClause, params: filterParams } = buildWhereClause(filters);
  
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const updateParams = Object.values(updates);
  
  const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
  const result = await query<{ affectedRows: number }>(
    sql,
    [...updateParams, ...filterParams]
  );
  
  return { affectedRows: result[0].affectedRows };
}

/**
 * Supprime un enregistrement d'une table
 */
export async function deleteOne(
  table: string,
  filters: Filters
): Promise<{ affectedRows: number }> {
  const { whereClause, params } = buildWhereClause(filters);
  
  const sql = `DELETE FROM ${table} ${whereClause}`;
  const result = await query<{ affectedRows: number }>(sql, params);
  
  return { affectedRows: result[0].affectedRows };
}

/**
 * Supprime plusieurs enregistrements d'une table
 */
export async function deleteMany(
  table: string,
  filters: Filters
): Promise<{ affectedRows: number }> {
  const { whereClause, params } = buildWhereClause(filters);
  
  const sql = `DELETE FROM ${table} ${whereClause}`;
  const result = await query<{ affectedRows: number }>(sql, params);
  
  return { affectedRows: result[0].affectedRows };
}

/**
 * Vérifie l'existence d'enregistrements dans une table
 */
export async function exists(
  table: string,
  filters: Filters
): Promise<boolean> {
  const { whereClause, params } = buildWhereClause(filters);
  
  const sql = `SELECT EXISTS(SELECT 1 FROM ${table} ${whereClause}) as exists`;
  const result = await query<{ exists: number }>(sql, params);
  
  return result[0].exists === 1;
} 