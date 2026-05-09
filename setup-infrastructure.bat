@echo off
REM ============================================
REM CBT Infrastructure Setup Script - Windows
REM ============================================

setlocal enabledelayedexpansion
cd /d c:\laragon\www\cbtmo

echo.
echo ========================================
echo CBT Infrastructure Setup - Windows
echo ========================================
echo.

REM Check Node.js
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js v18+
    pause
    exit /b 1
)
echo ✅ Node.js found: 
node --version

REM Check npm
echo.
echo [2/7] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found
    pause
    exit /b 1
)
echo ✅ npm found:
npm --version

REM Check PostgreSQL
echo.
echo [3/7] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL not found in PATH
    echo    (Laragon should have PostgreSQL, check if it's running)
) else (
    echo ✅ PostgreSQL found:
    psql --version
)

REM Install npm dependencies
echo.
echo [4/7] Installing npm dependencies...
if not exist node_modules (
    call npm install express ws cors dotenv pg redis
    if errorlevel 1 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

REM Create .env file
echo.
echo [5/7] Creating .env file...
if not exist .env (
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo WS_PORT=8080
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=cbtmo_db
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres
        echo REDIS_HOST=localhost
        echo REDIS_PORT=6379
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

REM Create server.js
echo.
echo [6/7] Creating server.js...
if not exist server.js (
    (
        echo const express = require('express'^);
        echo const WebSocket = require('ws'^);
        echo const http = require('http'^);
        echo const cors = require('cors'^);
        echo require('dotenv'^).config(^);
        echo.
        echo const app = express(^);
        echo const server = http.createServer(app^);
        echo const wss = new WebSocket.Server({ server }^);
        echo.
        echo app.use(cors(^)^);
        echo app.use(express.json(^)^);
        echo.
        echo wss.on('connection', (ws^) =^> {
        echo   console.log('[WS] Client connected'^);
        echo   
        echo   ws.on('message', (message^) =^> {
        echo     try {
        echo       const data = JSON.parse(message^);
        echo       console.log('[WS] Message:', data^);
        echo       
        echo       wss.clients.forEach((client^) =^> {
        echo         if (client.readyState === WebSocket.OPEN^) {
        echo           client.send(JSON.stringify({
        echo             type: 'update',
        echo             data: data,
        echo             timestamp: Date.now(^)
        echo           }^)^);
        echo         }
        echo       }^);
        echo     } catch (err^) {
        echo       console.error('[WS] Error:', err^);
        echo     }
        echo   }^);
        echo   
        echo   ws.on('close', (^) =^> {
        echo     console.log('[WS] Client disconnected'^);
        echo   }^);
        echo   
        echo   ws.on('error', (err^) =^> {
        echo     console.error('[WS] Error:', err^);
        echo   }^);
        echo }^);
        echo.
        echo app.get('/health', (req, res^) =^> {
        echo   res.json({ status: 'ok', timestamp: Date.now(^) }^);
        echo }^);
        echo.
        echo app.post('/api/metrics', (req, res^) =^> {
        echo   console.log('[API] Metrics:', req.body^);
        echo   res.json({ success: true }^);
        echo }^);
        echo.
        echo app.post('/api/errors', (req, res^) =^> {
        echo   console.log('[API] Error:', req.body^);
        echo   res.json({ success: true }^);
        echo }^);
        echo.
        echo const PORT = process.env.PORT ^|^| 3000;
        echo server.listen(PORT, (^) =^> {
        echo   console.log(`[Server] Listening on port ${PORT}`^);
        echo   console.log(`[WebSocket] Listening on port 8080`^);
        echo }^);
    ) > server.js
    echo ✅ server.js created
) else (
    echo ✅ server.js already exists
)

REM Create monitoring.js
echo.
echo [7/7] Creating monitoring.js...
if not exist monitoring.js (
    (
        echo const express = require('express'^);
        echo const app = express(^);
        echo.
        echo app.use(express.json(^)^);
        echo.
        echo const metrics = [];
        echo const errors = [];
        echo.
        echo app.post('/api/metrics', (req, res^) =^> {
        echo   metrics.push({
        echo     ...req.body,
        echo     timestamp: Date.now(^)
        echo   }^);
        echo   
        echo   if (metrics.length ^> 1000^) {
        echo     metrics.shift(^);
        echo   }
        echo   
        echo   res.json({ success: true }^);
        echo }^);
        echo.
        echo app.post('/api/errors', (req, res^) =^> {
        echo   errors.push({
        echo     ...req.body,
        echo     timestamp: Date.now(^)
        echo   }^);
        echo   
        echo   if (errors.length ^> 1000^) {
        echo     errors.shift(^);
        echo   }
        echo   
        echo   res.json({ success: true }^);
        echo }^);
        echo.
        echo app.get('/api/metrics', (req, res^) =^> {
        echo   res.json(metrics^);
        echo }^);
        echo.
        echo app.get('/api/errors', (req, res^) =^> {
        echo   res.json(errors^);
        echo }^);
        echo.
        echo app.get('/dashboard', (req, res^) =^> {
        echo   res.send(`
        echo     ^<!DOCTYPE html^>
        echo     ^<html^>
        echo     ^<head^>
        echo       ^<title^>CBT Monitoring Dashboard^</title^>
        echo       ^<style^>
        echo         body { font-family: Arial; margin: 20px; }
        echo         .metric { padding: 10px; border: 1px solid #ccc; margin: 10px 0; }
        echo         .error { padding: 10px; border: 1px solid red; margin: 10px 0; background: #ffe0e0; }
        echo       ^</style^>
        echo     ^</head^>
        echo     ^<body^>
        echo       ^<h1^>CBT Monitoring Dashboard^</h1^>
        echo       ^<h2^>Metrics (${metrics.length}^)^</h2^>
        echo       ^<div id="metrics"^>^</div^>
        echo       ^<h2^>Errors (${errors.length}^)^</h2^>
        echo       ^<div id="errors"^>^</div^>
        echo       ^<script^>
        echo         setInterval(^(^) =^> {
        echo           fetch('/api/metrics'^).then(r =^> r.json(^)^).then(data =^> {
        echo             document.getElementById('metrics'^).innerHTML = data.map(m =^> 
        echo               '^<div class="metric"^>' + JSON.stringify(m^) + '^</div^>'
        echo             ^).join(''^);
        echo           }^);
        echo           
        echo           fetch('/api/errors'^).then(r =^> r.json(^)^).then(data =^> {
        echo             document.getElementById('errors'^).innerHTML = data.map(e =^> 
        echo               '^<div class="error"^>' + JSON.stringify(e^) + '^</div^>'
        echo             ^).join(''^);
        echo           }^);
        echo         }, 5000^);
        echo       ^</script^>
        echo     ^</body^>
        echo     ^</html^>
        echo   `^);
        echo }^);
        echo.
        echo app.listen(3001, (^) =^> {
        echo   console.log('Monitoring on http://localhost:3001'^);
        echo   console.log('Dashboard on http://localhost:3001/dashboard'^);
        echo }^);
    ) > monitoring.js
    echo ✅ monitoring.js created
) else (
    echo ✅ monitoring.js already exists
)

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Install Redis (if not already installed^):
echo    - Download: https://github.com/microsoftarchive/redis/releases
echo    - Or use: choco install redis
echo.
echo 2. Start Redis:
echo    redis-server
echo.
echo 3. Start WebSocket Server:
echo    node server.js
echo.
echo 4. Start Monitoring (in another terminal^):
echo    node monitoring.js
echo.
echo 5. Test Services:
echo    - WebSocket: ws://localhost:8080
echo    - Monitoring: http://localhost:3001/dashboard
echo    - Health: http://localhost:3000/health
echo.
echo 6. Update exam.html with script tags (see INFRASTRUCTURE-SETUP-WINDOWS.md^)
echo.
echo 7. Run database optimization:
echo    psql -U postgres -d cbtmo_db -f db-optimization.sql
echo.
pause
