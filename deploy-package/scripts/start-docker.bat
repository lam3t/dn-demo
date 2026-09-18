@echo off
setlocal enabledelayedexpansion
title TN EDU - Khoi chay he thong bang Docker Compose

echo ======================================================================
echo    TN EDU - KHOI CHAY HE THONG BANG DOCKER COMPOSE (1 CHAM)
echo ======================================================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Docker trong he thong!
    echo Vui long cai dat Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0.."

echo Dang build va khoi chay 3 Containers (PostgreSQL, Backend, Frontend)...
docker compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo    HE THONG TN EDU DA KHOI CHAY THANH CONG!
    echo    - Dia chi truy cap: http://localhost (Port 80)
    echo    - Tai khoan System Admin: 0913016667 (Pass: 123456)
    echo ======================================================================
) else (
    echo.
    echo [LOI] Khoi chay Docker that bai!
)

echo.
pause
