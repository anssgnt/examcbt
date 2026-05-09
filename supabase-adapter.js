/* ========================================================
   🔥 SUPABASE CORE ADAPTER
   ======================================================== */

const SUPABASE_CONFIG = {
  enabled: true,
  url: 'https://dmydinmosdxazypdwbed.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8'
};

/**
 * Generic fetch function with timeout
 */
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Utility for adding random delay to prevent server spikes (Thundering Herd)
 */
window.jitter = async function(min = 1000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * fetchWithRetry - Executes request with exponential backoff
 */
async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const res = await fetchWithTimeout(url, options);
            // Retry only on server errors (5xx) or rate limits (429)
            if (res.ok || (res.status !== 429 && res.status < 500)) {
                return res;
            }
            console.warn(`[Retry] Server error ${res.status}. Attempt ${attempt + 1}/${maxRetries}`);
        } catch (e) {
            if (e.name === 'AbortError') {
                console.warn(`[Retry] Request timeout. Attempt ${attempt + 1}/${maxRetries}`);
            } else {
                console.error(`[Retry] Network error: ${e.message}. Attempt ${attempt + 1}/${maxRetries}`);
            }
        }
        attempt++;
        if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error('Max retries reached');
}


async function fetchSupabase(table, filters = {}) {
  if (!SUPABASE_CONFIG.enabled) return { success: false, error: 'Disabled' };
  const params = new URLSearchParams();
  for (const key in filters) params.append(key, filters[key]);
  const qs = params.toString();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  
  try {
    const res = await fetchWithRetry(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    console.error(`[Supabase] Fetch ${table} error:`, e);
    return { success: false, error: e.message };
  }
}

async function insertSupabase(table, payload) {
  if (!SUPABASE_CONFIG.enabled) return { success: false };
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    return { success: res.ok };
  } catch (e) { return { success: false, error: e.message }; }
}

async function deleteSupabase(table, filters = {}) {
  if (!SUPABASE_CONFIG.enabled) return { success: false };
  const params = new URLSearchParams();
  for (const key in filters) params.append(key, filters[key]);
  const qs = params.toString();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    return { success: res.ok };
  } catch (e) { return { success: false, error: e.message }; }
}

async function updateSupabase(table, payload, filters = {}) {
  if (!SUPABASE_CONFIG.enabled) return { success: false };
  const params = new URLSearchParams();
  for (const key in filters) params.append(key, filters[key]);
  const qs = params.toString();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return { success: res.ok };
  } catch (e) { return { success: false, error: e.message }; }
}

async function invokeSupabaseFunction(functionName, payload = {}, timeoutMs = 12000) {
  if (!SUPABASE_CONFIG.enabled) return { success: false, error: 'Disabled' };
  const url = `${SUPABASE_CONFIG.url}/functions/v1/${functionName}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    }, timeoutMs);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      return { success: false, status: res.status, error: (data && (data.error || data.message)) || `HTTP ${res.status}`, data };
    }
    return { success: true, data: data || {} };
  } catch (e) {
    if (e.name === 'AbortError') return { success: false, error: 'Timeout' };
    return { success: false, error: e.message };
  }
}

window.fetchSupabase = fetchSupabase;
window.insertSupabase = insertSupabase;
window.deleteSupabase = deleteSupabase;
window.updateSupabase = updateSupabase;
window.invokeSupabaseFunction = invokeSupabaseFunction;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

/**
 * localDB - Lightweight IndexedDB Wrapper
 * Provides asynchronous storage for large data sets (Soal, Peserta, etc.)
 */
const DB_NAME = 'CBT_LocalDB';
const DB_VERSION = 1;
const STORES = ['cache', 'exam_data', 'user_session'];

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            STORES.forEach(store => {
                if (!db.objectStoreNames.contains(store)) {
                    db.createObjectStore(store);
                }
            });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

window.localDB = {
    async set(store, key, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            os.put(value, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },
    async get(store, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const os = tx.objectStore(store);
            const req = os.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async delete(store, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            os.delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },
    async clear(store) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            os.clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },
    async getAll(store) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const os = tx.objectStore(store);
            const req = os.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};
