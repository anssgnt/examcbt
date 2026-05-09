/**
 * Redis Connection
 * Redis Cache for Phase 6
 */

const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: parseInt(process.env.REDIS_DB) || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

client.on('error', (err) => {
  console.error('[Redis] Error:', err);
});

client.on('connect', () => {
  console.log('[Redis] Connected');
});

client.on('ready', () => {
  console.log('[Redis] Ready');
});

client.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...');
});

/**
 * Get value from cache
 */
function get(key) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) {
        console.error('[Redis] Get error:', err);
        reject(err);
      } else {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          resolve(data);
        }
      }
    });
  });
}

/**
 * Set value in cache
 */
function set(key, value, ttl = 3600) {
  return new Promise((resolve, reject) => {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    client.setex(key, ttl, data, (err) => {
      if (err) {
        console.error('[Redis] Set error:', err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Delete value from cache
 */
function del(key) {
  return new Promise((resolve, reject) => {
    client.del(key, (err) => {
      if (err) {
        console.error('[Redis] Delete error:', err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Clear all cache
 */
function flushAll() {
  return new Promise((resolve, reject) => {
    client.flushall((err) => {
      if (err) {
        console.error('[Redis] Flush error:', err);
        reject(err);
      } else {
        console.log('[Redis] Cache cleared');
        resolve(true);
      }
    });
  });
}

/**
 * Get cache stats
 */
function getStats() {
  return new Promise((resolve, reject) => {
    client.info('stats', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Close connection
 */
function close() {
  return new Promise((resolve) => {
    client.quit(() => {
      console.log('[Redis] Connection closed');
      resolve();
    });
  });
}

module.exports = {
  client,
  get,
  set,
  del,
  flushAll,
  getStats,
  close,
};
