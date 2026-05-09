@echo off
REM ============================================
REM CBT Startup Script - Start All Services
REM ============================================

echo.
echo ========================================
echo CBT Infrastructure Startup
echo ========================================
echo.

cd /d c:\laragon\www\cbtmo

REM Check if services are already running
echo Checking services...

REM Start Redis
echo.
echo [1/3] Starting Redis...
tasklist | find /i "redis-server" >nul
if errorlevel 1 (
    start "Redis Server" redis-server
    timeout /t 2 /nobreak
    echo ✅ Redis started on port 6379
) else (
    echo ✅ Redis already running
)

REM Start WebSocket Server
echo.
echo [2/3] Starting WebSocket Server...
tasklist | find /i "node" >nul
if errorlevel 1 (
    start "WebSocket Server" cmd /k "node server.js"
    timeout /t 2 /nobreak
    echo ✅ WebSocket Server started on port 3000 & 8080
) else (
    echo ✅ Node.js already running
)

REM Start Monitoring
echo.
echo [3/3] Starting Monitoring...
start "Monitoring Dashboard" cmd /k "node monitoring.js"
timeout /t 2 /nobreak
echo ✅ Monitoring started on port 3001

echo.
echo ========================================
echo ✅ All Services Started!
echo ========================================
echo.
echo Services Running:
echo - Apache (Laragon): http://localhost
echo - WebSocket: ws://localhost:8080
echo - Node.js Server: http://localhost:3000/health
echo - Monitoring: http://localhost:3001/dashboard
echo - PostgreSQL: localhost:5432
echo - Redis: localhost:6379
echo.
echo Press any key to continue...
pause
