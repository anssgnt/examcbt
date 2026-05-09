# ✅ SETUP INFRASTRUCTURE - COMPLETE

## 📋 Status

Setup infrastructure untuk Windows/Laragon telah selesai dibuat.

**Files Created:**
- ✅ `setup-infrastructure.bat` - Automated setup script
- ✅ `startup.bat` - Service startup script
- ✅ `package.json` - Node.js dependencies
- ✅ `.env.example` - Configuration template
- ✅ `db-connection.js` - Database connection pool
- ✅ `redis-connection.js` - Redis cache connection
- ✅ `server.js` - WebSocket server (created by setup script)
- ✅ `monitoring.js` - Monitoring dashboard (created by setup script)

---

## 🚀 QUICK START

### Step 1: Run Setup Script
```bash
cd c:\laragon\www\cbtmo
setup-infrastructure.bat
```

**What it does:**
- ✅ Check Node.js & npm
- ✅ Check PostgreSQL
- ✅ Install npm dependencies
- ✅ Create .env file
- ✅ Create server.js
- ✅ Create monitoring.js

**Time:** ~2 menit

---

### Step 2: Install Redis

**Option A: Using Chocolatey (Recommended)**
```bash
choco install redis
```

**Option B: Manual Download**
1. Download: https://github.com/microsoftarchive/redis/releases
2. Download: `Redis-x64-3.2.100.msi`
3. Run installer
4. Default path: `C:\Program Files\Redis`

**Verify Installation:**
```bash
redis-cli --version
redis-cli ping
# Should return: PONG
```

**Time:** ~5 menit

---

### Step 3: Start All Services

**Option A: Using Startup Script**
```bash
startup.bat
```

**Option B: Manual Start**

Terminal 1 - Redis:
```bash
redis-server
```

Terminal 2 - WebSocket Server:
```bash
cd c:\laragon\www\cbtmo
node server.js
```

Terminal 3 - Monitoring:
```bash
cd c:\laragon\www\cbtmo
node monitoring.js
```

**Time:** ~1 menit

---

### Step 4: Verify Services

**Check All Services Running:**
```bash
# WebSocket Server
curl http://localhost:3000/health

# Monitoring Dashboard
http://localhost:3001/dashboard

# Redis
redis-cli ping
# Should return: PONG

# PostgreSQL (Laragon)
psql -U postgres -d cbtmo_db -c "SELECT 1;"
```

**Expected Output:**
```
✅ WebSocket Server: {"status":"ok","timestamp":1234567890}
✅ Monitoring: Dashboard loads
✅ Redis: PONG
✅ PostgreSQL: 1 row
```

---

### Step 5: Update exam.html

Add these script tags before `</body>`:

```html
<!-- Phase 1-3: Optimization -->
<script src="/lazy-loading-core.js"></script>
<link rel="stylesheet" href="/lazy-loading.css">
<script src="/sw-image-cache.js"></script>

<!-- Phase 4: Advanced Service Worker -->
<script src="/predictive-cache.js"></script>
<script src="/differential-sync.js"></script>
<script src="/data-compression.js"></script>
<script src="/exam-advanced-integration.js"></script>

<!-- Phase 5: ES Modules -->
<script type="module" src="/modules-init.js"></script>

<!-- Phase 6: Database Optimization -->
<script src="/db-connection.js"></script>
<script src="/redis-connection.js"></script>

<!-- Phase 7: Real-time -->
<script src="/realtime-sync.js"></script>

<!-- Phase 9: Monitoring -->
<script src="/performance-monitor.js"></script>
<script src="/error-tracker.js"></script>

<!-- Register Service Workers -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-image-cache.js');
    navigator.serviceWorker.register('/sw-advanced.js');
  }
</script>
```

---

### Step 6: Run Database Optimization

```bash
# Connect to PostgreSQL
psql -U postgres -d cbtmo_db

# Run optimization SQL
\i db-optimization.sql

# Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'peserta';

# Exit
\q
```

---

## 📊 SERVICES RUNNING

After setup, you should have:

```
✅ Apache (Laragon) - Port 80
   http://localhost

✅ MySQL (Laragon) - Port 3306
   localhost:3306

✅ PostgreSQL - Port 5432
   localhost:5432

✅ Node.js Server - Port 3000
   http://localhost:3000/health

✅ WebSocket Server - Port 8080
   ws://localhost:8080

✅ Monitoring Server - Port 3001
   http://localhost:3001/dashboard

✅ Redis - Port 6379
   localhost:6379
```

---

## 🔍 TESTING

### Test WebSocket Connection

**In Browser Console:**
```javascript
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({ type: 'test', data: 'hello' }));
```

### Test Monitoring API

**Send Metrics:**
```bash
curl -X POST http://localhost:3001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"metric":"test","value":100}'
```

**Get Metrics:**
```bash
curl http://localhost:3001/api/metrics
```

### Test Database Connection

**In Node.js:**
```javascript
const db = require('./db-connection');
const result = await db.query('SELECT 1');
console.log(result.rows);
```

### Test Redis Connection

**In Node.js:**
```javascript
const redis = require('./redis-connection');
await redis.set('test', 'hello', 3600);
const value = await redis.get('test');
console.log(value); // 'hello'
```

---

## ⚠️ TROUBLESHOOTING

### Redis not starting

**Problem:** `redis-server: command not found`

**Solution:**
1. Check if Redis is installed: `redis-cli --version`
2. If not installed, install using Chocolatey: `choco install redis`
3. Or download from: https://github.com/microsoftarchive/redis/releases

### WebSocket connection failed

**Problem:** `WebSocket connection to 'ws://localhost:8080' failed`

**Solution:**
1. Check if Node.js server is running: `node server.js`
2. Check if port 8080 is in use: `netstat -ano | findstr :8080`
3. Check firewall: Windows Defender Firewall → Allow app through firewall
4. Add Node.js to allowed apps

### Database connection error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Check PostgreSQL running in Laragon
2. Check credentials in `.env` file
3. Test connection: `psql -U postgres -d cbtmo_db -c "SELECT 1;"`

### Module loading error

**Problem:** `Failed to load module script`

**Solution:**
1. Check if modules exist: `dir modules\`
2. Check browser console for errors
3. Check CORS headers
4. Check file paths in HTML

---

## 📝 CONFIGURATION

### .env File

Edit `.env` to customize settings:

```bash
# Server
NODE_ENV=development
PORT=3000
WS_PORT=8080
MONITORING_PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbtmo_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Application
LOG_LEVEL=info
CACHE_TTL=3600
MAX_CONNECTIONS=20
```

---

## 🎯 NEXT STEPS

### Immediate (Today)
1. ✅ Run `setup-infrastructure.bat`
2. ✅ Install Redis
3. ✅ Start all services with `startup.bat`
4. ✅ Verify services running
5. ✅ Update `exam.html`
6. ✅ Run database optimization

### Short-term (This Week)
1. Test Phase 1-4 performance
2. Monitor error logs
3. Collect user feedback
4. Verify cache hit rate

### Medium-term (Next Week)
1. Deploy Phase 5-7
2. Setup WebSocket monitoring
3. Optimize database queries
4. Test real-time features

### Long-term (Next Month)
1. Deploy Phase 8-9
2. Setup Nginx load balancing
3. Setup Docker/Kubernetes
4. Configure auto-scaling

---

## 📊 PERFORMANCE TARGETS

### Phase 1-4 (Current)
- Navigation Speed: 30ms (3.3x faster)
- Bandwidth: 5MB/day (90% reduction)
- Memory: 2MB (80% reduction)
- Cache Hit Rate: 99%
- Concurrent Users: 10,000+

### Phase 5-7 (Next)
- Navigation Speed: 20ms (5x faster)
- Bandwidth: 3MB/day (94% reduction)
- Memory: 1MB (90% reduction)
- Cache Hit Rate: 99.5%
- Concurrent Users: 50,000+

### Phase 8-9 (Future)
- Navigation Speed: 10ms (10x faster)
- Bandwidth: 1MB/day (98% reduction)
- Memory: 500KB (95% reduction)
- Cache Hit Rate: 99.9%
- Concurrent Users: 100,000+

---

## 📞 SUPPORT

### Documentation
- `INFRASTRUCTURE-SETUP-WINDOWS.md` - Detailed setup guide
- `DEPLOYMENT-GUIDE-COMPLETE.md` - Deployment guide
- `DEPLOYMENT-QUICK-START.md` - Quick reference
- `READINESS-ANALYSIS.md` - Readiness analysis

### Files
- `setup-infrastructure.bat` - Setup script
- `startup.bat` - Startup script
- `package.json` - Dependencies
- `.env.example` - Configuration template

---

## ✅ CHECKLIST

- [ ] Run `setup-infrastructure.bat`
- [ ] Install Redis
- [ ] Start all services
- [ ] Verify services running
- [ ] Update `exam.html`
- [ ] Run database optimization
- [ ] Test WebSocket connection
- [ ] Test monitoring dashboard
- [ ] Test database connection
- [ ] Test Redis connection
- [ ] Monitor performance
- [ ] Collect user feedback

---

**Version:** 1.0
**Status:** Ready for Deployment
**Last Updated:** May 9, 2026

