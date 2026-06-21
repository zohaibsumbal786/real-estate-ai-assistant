@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Dubai AI Business Agent - Full Native Stack

echo.
echo ============================================================
echo  Dubai AI Business Agent - Full Native Local Runner
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js 20+ and run this file again.
  goto :fail
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not available in PATH.
  goto :fail
)

if not exist ".env" (
  echo [SETUP] .env was not found. Creating it from .env.example...
  copy ".env.example" ".env" >nul
  echo [SETUP] Created .env. Review secrets later for production.
)

if not exist "node_modules" (
  echo [SETUP] Installing npm dependencies...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo [CHECK] Checking Redis...
where redis-cli >nul 2>nul
if not errorlevel 1 (
  redis-cli ping >nul 2>nul
  if errorlevel 1 (
    where redis-server >nul 2>nul
    if not errorlevel 1 (
      echo [SETUP] Redis is not responding. Starting redis-server in a new window...
      start "Dubai AI Redis" /min redis-server
      timeout /t 2 /nobreak >nul
    ) else (
      echo [WARN] Redis is not responding and redis-server was not found in PATH.
      echo        Start your local Redis server before using queues/workers.
    )
  ) else (
    echo [OK] Redis is running.
  )
) else (
  where redis-server >nul 2>nul
  if not errorlevel 1 (
    echo [SETUP] redis-cli was not found, but redis-server exists. Starting Redis...
    start "Dubai AI Redis" /min redis-server
    timeout /t 2 /nobreak >nul
  ) else (
    echo [WARN] Redis tools were not found in PATH.
    echo        If Redis runs as a Windows service, this is fine. Otherwise start Redis manually.
  )
)

echo.
echo [DB] Generating Prisma client...
call npm.cmd run db:generate
if errorlevel 1 goto :fail

echo.
echo [DB] Applying Prisma migrations...
call npm.cmd run db:deploy
if errorlevel 1 (
  echo.
  echo [ERROR] Database migration failed.
  echo Make sure PostgreSQL is running and DATABASE_URL in .env is correct.
  goto :fail
)

echo.
echo [DB] Seeding demo plans, organization, users, and business hours...
call npm.cmd run db:seed
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo  Starting full project
echo.
echo  Web: http://localhost:3000/en/login
echo  Arabic: http://localhost:3000/ar/login
echo  API: http://localhost:4000/health
echo.
echo  Demo login: admin@demo.ae / DemoPass123!
echo  Press Ctrl+C in this window to stop the stack.
echo ============================================================
echo.

call npm.cmd run dev:all
goto :end

:fail
echo.
echo ============================================================
echo  Startup failed. Fix the message above, then run this file again.
echo ============================================================
pause
exit /b 1

:end
endlocal
