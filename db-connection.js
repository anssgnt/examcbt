/**
 * Database Connection Pool
 * PostgreSQL Connection Pooling for Phase 6
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cbtmo_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  console.log('[DB] New connection established');
});

pool.on('remove', () => {
  console.log('[DB] Connection removed from pool');
});

/**
 * Query helper with error handling
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query executed in ${duration}ms`);
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err);
    throw err;
  }
}

/**
 * Get pool stats
 */
function getStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Close pool
 */
async function close() {
  await pool.end();
  console.log('[DB] Connection pool closed');
}

module.exports = {
  pool,
  query,
  getStats,
  close,
};
