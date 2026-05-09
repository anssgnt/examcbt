# 🚀 DEPLOYMENT GUIDE - COMPLETE

## 📋 Overview

Panduan lengkap untuk deploy semua 9 phases ke production.

**Estimated Time:** 2-3 hari
**Risk Level:** Low (backward compatible)
**Rollback Time:** <5 menit

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Environment Setup
- [ ] Server ready (Linux/Windows)
- [ ] Node.js v18+ installed
- [ ] PostgreSQL installed
- [ ] Redis installed (optional)
- [ ] Nginx installed (optional)
- [ ] Docker installed (optional)
- [ ] Git configured

### Code Preparation
- [ ] All files uploaded to server
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates ready
- [ ] Backup created

### Testing
- [ ] All tests passing locally
- [ ] Performance verified
- [ ] Security scan passed
- [ ] Load testing completed

---

## 🔧 DEPLOYMENT STEPS

### STEP 1: Prepare Server (30 minutes)

#### 1.1 SSH ke Server
```bash
ssh user@your-server.com
cd /var/www/cbtmo
```

#### 1.2 Create Backup
```bash
# Backup current files
cp -r . ../cbtmo-backup-$(date +%Y%m%d-%H%M%S)

# Backup database
pg_dump cbtmo_db > cbtmo-db-backup-$(date +%Y%m%d-%H%M%S).sql
```

#### 1.3 Create Directories
```bash
mkdir -p modules
mkdir -p logs
mkdir -p cache
chmod 755 modules logs cache
```

---

### STEP 2: Deploy Phase 1-4 (1 hour)

#### 2.1 Upload Files
```bash
# Copy Phase 1-3 files
scp supabase-optimized-functions.sql user@server:/var/www/cbtmo/
scp query-selectivity-optimized-handlers.js user@server:/var/www/cbtmo/
scp admin-monitoring-optimized.js user@server:/var/www/cbtmo/
scp modules/virtual-scroller.js user@server:/var/www/cbtmo/modules/
scp modules/virtual-scroller.css user@server:/var/www/cbtmo/modules/
scp admin-monitoring-virtual-scroll.js user@server:/var/www/cbtmo/
scp test-virtual-scroller.html user@server:/var/www/cbtmo/
scp lazy-loading-core.js user@server:/var/www/cbtmo/
scp lazy-loading.css user@server:/var/www/cbtmo/
scp sw-image-cache.js user@server:/var/www/cbtmo/

# Copy Phase 4 files
scp predictive-cache.js user@server:/var/www/cbtmo/
scp differential-sync.js user@server:/var/www/cbtmo/
scp data-compression.js user@server:/var/www/cbtmo/
scp sw-advanced.js user@server:/var/www/cbtmo/
scp exam-advanced-integration.js user@server:/var/www/cbtmo/
```

#### 2.2 Update HTML Files
```bash
# Edit exam.html
nano exam.html

# Add before closing </body>:
<!--
<!-- Phase 4: Advanced Service Worker & Caching -->
<script src="/predictive-cache.js"></script>
<script src="/differential-sync.js"></script>
<script src="/data-compression.js"></script>
<script src="/exam-advanced-integration.js"></script>

<!-- Register Advanced Service Worker -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-advanced.js')
      .then(reg => console.log('✅ SW registered'))
      .catch(err => console.error('❌ Error:', err));
  }
</script>
-->
```

#### 2.3 Run Database Migrations
```bash
# Connect to PostgreSQL
psql -U postgres -d cbtmo_db

# Run optimization queries
\i supabase-optimized-functions.sql

# Exit
\q
```

#### 2.4 Verify Phase 1-4
```bash
# Check files exist
ls -la *.js | grep -E "predictive|differential|compression|sw-advanced|exam-advanced"

# Check Service Worker registration
curl -I http://localhost/sw-advanced.js

# Test in browser
# Open DevTools → Application → Service Workers
# Should see "sw-advanced.js" registered
```

---

### STEP 3: Deploy Phase 5 (1 hour)

#### 3.1 Upload Module Files
```bash
scp modules/loader.js user@server:/var/www/cbtmo/modules/
scp modules/core.js user@server:/var/www/cbtmo/modules/
scp modules/ui.js user@server:/var/www/cbtmo/modules/
scp modules/api.js user@server:/var/www/cbtmo/modules/
scp modules/exam.js user@server:/var/www/cbtmo/modules/
scp modules/admin.js user@server:/var/www/cbtmo/modules/
scp modules/cache.js user@server:/var/www/cbtmo/modules/
scp modules/sync.js user@server:/var/www/cbtmo/modules/
scp modules/monitoring.js user@server:/var/www/cbtmo/modules/
scp modules/utils.js user@server:/var/www/cbtmo/modules/
```

#### 3.2 Update exam.html
```html
<!-- Add before closing </body>: -->
<script type="module">
  import { moduleLoader } from '/modules/loader.js';
  
  // Preload critical modules
  await moduleLoader.preload(['core', 'ui', 'api', 'exam']);
  
  console.log('✅ Modules loaded');
</script>
```

#### 3.3 Verify Phase 5
```bash
# Check modules exist
ls -la modules/

# Test module loading in browser console
moduleLoader.load('core').then(m => console.log('✅ Core loaded'))
```

---

### STEP 4: Deploy Phase 6 (1 hour)

#### 4.1 Upload Database Files
```bash
scp db-optimization.sql user@server:/var/www/cbtmo/
scp db-pool.js user@server:/var/www/cbtmo/
scp redis-cache.js user@server:/var/www/cbtmo/
```

#### 4.2 Run Database Optimization
```bash
# Connect to PostgreSQL
psql -U postgres -d cbtmo_db

# Run optimization
\i db-optimization.sql

# Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'peserta';

# Exit
\q
```

#### 4.3 Setup Redis (Optional)
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Verify
redis-cli ping
# Should return: PONG
```

#### 4.4 Verify Phase 6
```bash
# Check database performance
psql -U postgres -d cbtmo_db -c "EXPLAIN ANALYZE SELECT * FROM peserta WHERE kelas = 'X A';"

# Should show significant performance improvement
```

---

### STEP 5: Deploy Phase 7 (1 hour)

#### 5.1 Upload WebSocket Files
```bash
scp realtime-sync.js user@server:/var/www/cbtmo/
scp server-websocket.js user@server:/var/www/cbtmo/
```

#### 5.2 Setup WebSocket Server
```bash
# Install dependencies
npm install ws

# Create server.js
cat > server.js << 'EOF'
const WebSocketServer = require('./server-websocket.js');
const server = new WebSocketServer(8080);
server.start();
EOF

# Start WebSocket server
node server.js &
```

#### 5.3 Update exam.html
```html
<!-- Add before closing </body>: -->
<script src="/realtime-sync.js"></script>
<script>
  // Initialize real-time sync
  realtimeSync.connect();
  
  // Listen for updates
  window.addEventListener('realtimeUpdate', (e) => {
    console.log('Real-time update:', e.detail);
  });
</script>
```

#### 5.4 Verify Phase 7
```bash
# Check WebSocket server running
netstat -an | grep 8080

# Test connection
wscat -c ws://localhost:8080
```

---

### STEP 6: Deploy Phase 8 (2 hours)

#### 6.1 Setup Docker (Optional)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Build Docker image
docker build -t cbtmo:latest .

# Run container
docker run -d -p 3000:3000 --name cbtmo cbtmo:latest
```

#### 6.2 Setup Nginx
```bash
# Install Nginx
sudo apt-get install nginx

# Copy config
sudo cp nginx.conf /etc/nginx/sites-available/cbtmo

# Enable site
sudo ln -s /etc/nginx/sites-available/cbtmo /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 6.3 Setup Kubernetes (Optional)
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Apply deployment
kubectl apply -f kubernetes-deployment.yaml

# Verify
kubectl get pods
kubectl get services
```

#### 6.4 Verify Phase 8
```bash
# Check Nginx
sudo systemctl status nginx

# Check Docker
docker ps

# Check Kubernetes
kubectl get all
```

---

### STEP 7: Deploy Phase 9 (30 minutes)

#### 7.1 Upload Monitoring Files
```bash
scp performance-monitor.js user@server:/var/www/cbtmo/
scp error-tracker.js user@server:/var/www/cbtmo/
```

#### 7.2 Update exam.html
```html
<!-- Add before closing </body>: -->
<script src="/performance-monitor.js"></script>
<script src="/error-tracker.js"></script>
```

#### 7.3 Setup Monitoring Dashboard
```bash
# Create monitoring endpoint
cat > monitoring.js << 'EOF'
const express = require('express');
const app = express();

app.post('/api/metrics', (req, res) => {
  console.log('Metrics:', req.body);
  res.json({ success: true });
});

app.post('/api/errors', (req, res) => {
  console.log('Error:', req.body);
  res.json({ success: true });
});

app.listen(3001, () => console.log('Monitoring on port 3001'));
EOF

# Start monitoring
node monitoring.js &
```

#### 7.4 Verify Phase 9
```bash
# Check monitoring endpoint
curl -X POST http://localhost:3001/api/metrics -H "Content-Type: application/json" -d '{"test": true}'

# Should return: {"success":true}
```

---

## 🔍 VERIFICATION

### Check All Services
```bash
# Check Node.js
node --version

# Check PostgreSQL
psql --version

# Check Redis
redis-cli --version

# Check Nginx
nginx -v

# Check Docker
docker --version

# Check Kubernetes
kubectl version
```

### Test Application
```bash
# Open browser
http://localhost/exam.html

# Check console for:
# ✅ SW registered
# ✅ Modules loaded
# ✅ Real-time connected
# ✅ Monitoring started

# Check DevTools:
# - Network: All files loaded
# - Application: Service Worker registered
# - Console: No errors
```

### Performance Test
```bash
# Load test
ab -n 1000 -c 10 http://localhost/

# Should show:
# - Requests per second: High
# - Failed requests: 0
# - Time per request: Low
```

---

## 📊 MONITORING

### Real-time Metrics
```bash
# Watch metrics
watch -n 1 'curl -s http://localhost:3001/api/metrics | jq .'

# Watch errors
watch -n 1 'curl -s http://localhost:3001/api/errors | jq .'
```

### Log Files
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f logs/app.log

# WebSocket logs
tail -f logs/websocket.log
```

---

## 🔄 ROLLBACK PLAN

### If Something Goes Wrong

#### Rollback Phase 1-4
```bash
# Restore backup
cp -r ../cbtmo-backup-YYYYMMDD-HHMMSS/* .

# Restart services
sudo systemctl restart nginx
node server.js &
```

#### Rollback Database
```bash
# Restore database backup
psql -U postgres -d cbtmo_db < cbtmo-db-backup-YYYYMMDD-HHMMSS.sql
```

#### Clear Browser Cache
```bash
# User must clear cache or wait 24 hours
# Or use Ctrl+Shift+Delete in browser
```

#### Unregister Service Worker
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

---

## 🐛 TROUBLESHOOTING

### Service Worker Not Registering
```javascript
// Check if HTTPS or localhost
console.log(location.protocol); // Should be https: or http:

// Check if file exists
fetch('/sw-advanced.js').then(r => console.log('Status:', r.status));

// Re-register
navigator.serviceWorker.register('/sw-advanced.js', { scope: '/' });
```

### Cache Not Working
```bash
# Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

# Unregister and re-register SW
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

### Database Connection Error
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d cbtmo_db -c "SELECT 1;"

# Check credentials in .env
cat .env | grep DATABASE
```

### WebSocket Connection Failed
```bash
# Check WebSocket server running
netstat -an | grep 8080

# Check firewall
sudo ufw allow 8080

# Restart WebSocket server
pkill -f "node server-websocket.js"
node server-websocket.js &
```

---

## ✅ POST-DEPLOYMENT

### After 1 Hour
- [ ] No errors in console
- [ ] Cache working
- [ ] Performance improved
- [ ] Users reporting no issues

### After 24 Hours
- [ ] All metrics normal
- [ ] No memory leaks
- [ ] No performance degradation
- [ ] User feedback positive

### After 1 Week
- [ ] All metrics stable
- [ ] Performance improvements verified
- [ ] Cost savings verified
- [ ] Ready for Phase 5-9

---

## 📝 DEPLOYMENT LOG

```
Deployment Date: [DATE]
Deployed By: [NAME]
Deployment Time: [TIME]
Duration: [DURATION]

Phase 1-4 Status: ✅ SUCCESS / ❌ FAILED
Phase 5 Status: ✅ SUCCESS / ❌ FAILED
Phase 6 Status: ✅ SUCCESS / ❌ FAILED
Phase 7 Status: ✅ SUCCESS / ❌ FAILED
Phase 8 Status: ✅ SUCCESS / ❌ FAILED
Phase 9 Status: ✅ SUCCESS / ❌ FAILED

Issues: [NONE / LIST ISSUES]

Metrics:
- Cache Hit Rate: [%]
- Response Time: [ms]
- Error Rate: [%]
- Uptime: [%]

Notes: [ADDITIONAL NOTES]
```

---

**Version:** 1.0
**Status:** Ready for Deployment
**Last Updated:** May 9, 2026

\n