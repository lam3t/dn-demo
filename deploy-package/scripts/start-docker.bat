@echo off
setlocal enabledelayedexpansion
title TN EDU - Khoi chay he thong bang Docker Compose

echo ======================================================================
echo    TN EDU - KHOI CHAY HE THONG BANG DOCKER COMPOSE (1 CHAM)
echo ======================================================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Docker CLI trong he thong!
    echo Vui long cai dat Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo [1/2] Dang kiem tra trang thai Docker Engine...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo [CANH BAO] DOCKER ENGINE / DOCKER DESKTOP CHUA CHAY!
    echo.
    echo Huong dan xu ly:
    echo 1. Vao Menu Start tren Windows, tim va mo ung dung "Docker Desktop".
    echo 2. Doi khoang 30-60 giay den khi bieu tuong chu ca voi o goc Taskbar
    echo    chuyen sang mau xanh la (Docker Desktop is running).
    echo 3. Chay lai file script nay!
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

echo [OK] Docker Engine dang hoat dong tot.
echo.
cd /d "%~dp0.."

echo [2/2] Dang build va khoi chay 3 Containers (PostgreSQL, Backend, Frontend)...
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
    echo ======================================================================
    echo [LOI] Khoi chay Docker that bai! Vui long kiem tra lai thong bao tren.
    echo ======================================================================
)

echo.
pause
