# 🔧 INFRASTRUCTURE SETUP - WINDOWS (LARAGON)

## 📋 Overview

Setup infrastructure untuk Phase 5-9 di Windows dengan Laragon.

**Environment:** Windows + Laragon
**Status:** Ready to Setup
**Time:** 2-3 jam

---

## ✅ PRE-REQUISITES

### Installed Software
- [x] Laragon (Apache, MySQL, PHP)
- [x] Node.js v18+
- [x] Git
- [ ] Redis (akan install)
- [ ] PostgreSQL (sudah ada di Laragon)

### Check Installation
```bash
# Check Node.js
node --version
npm --version

# Check PostgreSQL
psql --version

# Check Git
git --version
```

---

## 🚀 SETUP STEPS

### STEP 1: Setup Node.js Environment (15 menit)

#### 1.1 Create package.json
```bash
cd c:\laragon\www\cbtmo
npm init -y
```

#### 1.2 Install Dependencies
```bash
npm install express ws cors dotenv
npm install --save-dev nodemon
```

#### 1.3 Create .env file
```bash
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
WS_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbtmo_db
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
```

---

### STEP 2: Setup Redis (30 menit)

#### 2.1 Download Redis for Windows
```bash
# Option 1: Using Chocolatey (if installed)
choco install redis

# Option 2: Download from GitHub
# https://github.com/microsoftarchive/redis/releases
# Download: Redis-x64-3.2.100.msi
```

#### 2.2 Install Redis
```bash
# Run installer
# Default installation path: C:\Program Files\Redis

# Verify installation
redis-cli --version
```

#### 2.3 Start Redis Service
```bash
# Start Redis server
redis-server

# In another terminal, test connection
redis-cli ping
# Should return: PONG
```

#### 2.4 Configure Redis (Optional)
```bash
# Edit redis.conf
# C:\Program Files\Redis\redis.conf

# Set as Windows Service (optional)
redis-server --service-install
redis-server --service-start
```

---

### STEP 3: Setup WebSocket Server (30 menit)

#### 3.1 Create server.js
```bash
cat > server.js << 'EOF'
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[WS] Message:', data);
      
      // Broadcast to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            data: data,
            timestamp: Date.now()
          }));
        }
      });
    } catch (err) {
      console.error('[WS] Error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });
  
  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/metrics', (req, res) => {
  console.log('[API] Metrics:', req.body);
  res.json({ success: true });
});

app.post('/api/errors', (req, res) => {
  console.log('[API] Error:', req.body);
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[WebSocket] Listening on port ${WS_PORT}`);
});
EOF
```

#### 3.2 Start WebSocket Server
```bash
# Development mode (with auto-reload)
npm install -g nodemon
nodemon server.js

# Or production mode
node server.js
```

#### 3.3 Test WebSocket Connection
```bash
# In browser console
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({ type: 'test', data: 'hello' }));
```

---

### STEP 4: Setup Database (Phase 6) (30 menit)

#### 4.1 Run Database Optimization
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

#### 4.2 Setup Connection Pooling
```bash
# Create db-connection.js
cat > db-connection.js << 'EOF'
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
EOF
```

#### 4.3 Setup Redis Cache
```bash
# Create redis-connection.js
cat > redis-connection.js << 'EOF'
const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

client.on('connect', () => {
  console.log('Redis connected');
});

module.exports = client;
EOF
```

---

### STEP 5: Setup Monitoring (Phase 9) (30 menit)

#### 5.1 Create Monitoring Endpoint
```bash
cat > monitoring.js << 'EOF'
const express = require('express');
const app = express();

app.use(express.json());

// Store metrics
const metrics = [];
const errors = [];

// Metrics endpoint
app.post('/api/metrics', (req, res) => {
  metrics.push({
    ...req.body,
    timestamp: Date.now()
  });
  
  // Keep only last 1000 metrics
  if (metrics.length > 1000) {
    metrics.shift();
  }
  
  res.json({ success: true });
});

// Errors endpoint
app.post('/api/errors', (req, res) => {
  errors.push({
    ...req.body,
    timestamp: Date.now()
  });
  
  // Keep only last 1000 errors
  if (errors.length > 1000) {
    errors.shift();
  }
  
  res.json({ success: true });
});

// Get metrics
app.get('/api/metrics', (req, res) => {
  res.json(metrics);
});

// Get errors
app.get('/api/errors', (req, res) => {
  res.json(errors);
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CBT Monitoring Dashboard</title>
      <style>
        body { font-family: Arial; margin: 20px; }
        .metric { padding: 10px; border: 1px solid #ccc; margin: 10px 0; }
        .error { padding: 10px; border: 1px solid red; margin: 10px 0; background: #ffe0e0; }
      </style>
    </head>
    <body>
      <h1>CBT Monitoring Dashboard</h1>
      <h2>Metrics (${metrics.length})</h2>
      <div id="metrics"></div>
      <h2>Errors (${errors.length})</h2>
      <div id="errors"></div>
      <script>
        setInterval(() => {
          fetch('/api/metrics').then(r => r.json()).then(data => {
            document.getElementById('metrics').innerHTML = data.map(m => 
              '<div class="metric">' + JSON.stringify(m) + '</div>'
            ).join('');
          });
          
          fetch('/api/errors').then(r => r.json()).then(data => {
            document.getElementById('errors').innerHTML = data.map(e => 
              '<div class="error">' + JSON.stringify(e) + '</div>'
            ).join('');
          });
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

app.listen(3001, () => {
  console.log('Monitoring on http://localhost:3001');
  console.log('Dashboard on http://localhost:3001/dashboard');
});
EOF
```

#### 5.2 Start Monitoring
```bash
node monitoring.js
```

---

### STEP 6: Setup Phase 5 Modules (30 menit)

#### 6.1 Create Module Entry Point
```bash
cat > modules-init.js << 'EOF'
// Initialize all modules
import('./modules/loader.js').then(({ moduleLoader }) => {
  window.moduleLoader = moduleLoader;
  console.log('✅ Module loader initialized');
});

import('./modules/core.js').then(({ stateManager }) => {
  window.stateManager = stateManager;
  console.log('✅ State manager initialized');
});

import('./modules/cache.js').then(({ cacheManager }) => {
  window.cacheManager = cacheManager;
  console.log('✅ Cache manager initialized');
});

import('./modules/monitoring.js').then(({ performanceMonitor }) => {
  window.performanceMonitor = performanceMonitor;
  console.log('✅ Performance monitor initialized');
});
EOF
```

#### 6.2 Update exam.html
```html
<!-- Add before </body>: -->

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
```

---

## 🔍 VERIFICATION

### Check All Services Running
```bash
# Check Node.js server
curl http://localhost:3000/health

# Check WebSocket
wscat -c ws://localhost:8080

# Check Monitoring
curl http://localhost:3001/api/metrics

# Check Redis
redis-cli ping

# Check PostgreSQL
psql -U postgres -d cbtmo_db -c "SELECT 1;"
```

### Test in Browser
```
1. Open http://localhost/exam.html
2. DevTools → Console
   ✅ Should see all modules initialized
   ✅ Should see no errors
3. DevTools → Network
   ✅ Should see WebSocket connection
4. Open http://localhost:3001/dashboard
   ✅ Should see monitoring dashboard
```

---

## 📊 SERVICES RUNNING

After setup, you should have:

```
✅ Apache (Laragon) - Port 80
✅ MySQL (Laragon) - Port 3306
✅ PostgreSQL - Port 5432
✅ Node.js Server - Port 3000
✅ WebSocket Server - Port 8080
✅ Monitoring Server - Port 3001
✅ Redis - Port 6379
```

---

## 🚀 START ALL SERVICES

### Create startup script (startup.bat)
```batch
@echo off
echo Starting CBT Infrastructure...

REM Start Laragon (if not running)
echo Starting Laragon...
start "" "C:\laragon\laragon.exe"

REM Start Redis
echo Starting Redis...
start "Redis" redis-server

REM Start WebSocket Server
echo Starting WebSocket Server...
start "WebSocket" cmd /k "cd c:\laragon\www\cbtmo && node server.js"

REM Start Monitoring
echo Starting Monitoring...
start "Monitoring" cmd /k "cd c:\laragon\www\cbtmo && node monitoring.js"

echo All services started!
echo.
echo Services:
echo - Apache: http://localhost
echo - WebSocket: ws://localhost:8080
echo - Monitoring: http://localhost:3001/dashboard
echo - PostgreSQL: localhost:5432
echo - Redis: localhost:6379
```

### Run startup script
```bash
startup.bat
```

---

## ⚠️ TROUBLESHOOTING

### Redis not starting
```bash
# Check if port 6379 is in use
netstat -ano | findstr :6379

# Kill process using port
taskkill /PID <PID> /F

# Start Redis again
redis-server
```

### WebSocket connection failed
```bash
# Check if port 8080 is in use
netstat -ano | findstr :8080

# Check firewall
# Windows Defender Firewall → Allow app through firewall
# Add Node.js to allowed apps
```

### Database connection error
```bash
# Check PostgreSQL running
# Laragon → Services → PostgreSQL (should be green)

# Check credentials in .env
cat .env | findstr DB_

# Test connection
psql -U postgres -d cbtmo_db -c "SELECT 1;"
```

### Module loading error
```bash
# Check if modules exist
dir modules\

# Check browser console for errors
# DevTools → Console

# Check CORS headers
# Should allow localhost
```

---

## 📝 NEXT STEPS

1. ✅ Install Redis
2. ✅ Create Node.js server
3. ✅ Setup WebSocket
4. ✅ Setup Monitoring
5. ✅ Setup Database
6. ✅ Update HTML
7. ✅ Test all services
8. ✅ Deploy to production

---

**Version:** 1.0
**Status:** Ready for Setup
**Last Updated:** May 9, 2026

\n