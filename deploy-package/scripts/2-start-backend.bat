@echo off
setlocal enabledelayedexpansion
title TN EDU - Khoi chay Backend Service tren Windows Server

echo ======================================================================
echo    TN EDU - KHOI CHAY BACKEND SERVICE (PORT 5000)
echo ======================================================================
echo.

cd /d "%~dp0..\backend"

if not exist ".env" (
    echo [CANH BAO] Chua tim thay file .env, dang sao chep tu .env.example...
    copy ".env.example" ".env"
    echo Vui long kiem tra va sua mat khau Database trong file "backend\.env" neu can!
    notepad ".env"
)

if not exist "node_modules\bullmq" (
    echo [1/2] Dang cai dat day du thu vien Production dependencies (bullmq, prisma, ioredis...)...
    call npm install --omit=dev
    echo [2/2] Dang sinh ma Prisma Client...
    call npx prisma generate
)

echo.
echo ======================================================================
echo    Dang khoi dong Backend API tren http://localhost:5000 ...
echo    (Nhan Ctrl + C de dung dich vu)
echo ======================================================================
echo.
node dist/index.js

pause
