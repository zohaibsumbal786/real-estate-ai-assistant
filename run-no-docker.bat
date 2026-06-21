@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Dubai AI Business Agent - No Docker Runner

echo.
echo ============================================================
echo  Dubai AI Business Agent - Windows Quick Start (No Docker)
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 20+ is required.
  goto :fail
)

if not exist ".env" copy ".env.example" ".env" >nul

echo [DB] Starting Prisma local database (PGlite, no Docker)...
call npx.cmd prisma dev start -n dubai-ai --schema packages/db/prisma/schema.prisma 2>nul
call npx.cmd prisma dev -d -n dubai-ai --schema packages/db/prisma/schema.prisma >nul 2>nul

for /f "tokens=*" %%i in ('npx.cmd prisma dev ls 2^>nul ^| findstr /C:"postgres://"') do set DBLINE=%%i

echo.
echo [DB] Using Prisma Dev PostgreSQL on port 51214
echo       Update .env DATABASE_URL if this is your first run:
echo       postgresql://postgres:postgres@localhost:51214/template1?schema=public

powershell -NoProfile -Command "(Get-Content .env) -replace '^DATABASE_URL=.*', 'DATABASE_URL=\"postgresql://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable&schema=public\"' | Set-Content .env"
powershell -NoProfile -Command "(Get-Content .env) -replace '^REDIS_OPTIONAL=.*', 'REDIS_OPTIONAL=\"true\"' | Set-Content .env"
findstr /C:"REDIS_OPTIONAL" .env >nul || echo REDIS_OPTIONAL="true">> .env

if not exist "node_modules" (
  echo [SETUP] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo [DB] Generating client and applying migrations...
call npm.cmd run db:generate
if errorlevel 1 goto :fail
call npm.cmd run db:deploy
if errorlevel 1 goto :fail
call npm.cmd run db:seed
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo  Starting web + API (Redis optional — workers skipped)
echo.
echo  Landing:  http://localhost:3000/en
echo  Login:    http://localhost:3000/en/login
echo  Dashboard: http://localhost:3000/en/dashboard
echo  API:      http://localhost:4000/health
echo.
echo  Demo: admin@demo.ae / DemoPass123!
echo  Press Ctrl+C to stop.
echo ============================================================
echo.

call npm.cmd run dev
goto :end

:fail
echo Startup failed. See messages above.
pause
exit /b 1

:end
endlocal
