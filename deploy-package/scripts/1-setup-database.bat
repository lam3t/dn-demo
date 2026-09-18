@echo off
setlocal enabledelayedexpansion
title TN EDU - Khoi tao CSDL PostgreSQL tren Windows Server

echo ======================================================================
echo    TN EDU - KHOI TAO CO SO DU LIEU POSTGRESQL TU DONG
echo ======================================================================
echo.

rem 1. Tu dong tim duong dan psql cua PostgreSQL tren Windows
where psql >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\17\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\15\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\14\bin;%PATH%"
)

where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [CANH BAO] Khong tim thay lenh 'psql' trong he thong!
    echo Ban co the chay truc tiep file SQL bang cong cu pgAdmin 4:
    echo 1. Mo pgAdmin 4 -> Tao Database 'tn_edu'.
    echo 2. Mo file 'database\tn_edu_complete_init.sql' va bam F5 de chay.
    echo.
    pause
    exit /b 1
)

set PG_HOST=localhost
set PG_PORT=5432
set PG_USER=postgres
set PG_DB=tn_edu

echo [1/3] Thong tin ket noi PostgreSQL:
echo - Host: %PG_HOST%
echo - Port: %PG_PORT%
echo - User: %PG_USER%
echo - Database: %PG_DB%
echo.
set /p PGPASSWORD="Nhap mat khau PostgreSQL cua user postgres: "
echo.

echo [2/3] Kiem tra va tao CSDL "%PG_DB%"...
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d postgres -c "CREATE DATABASE %PG_DB% ENCODING 'UTF8';" >nul 2>&1
echo - CSDL "%PG_DB%" da san sang.

echo.
echo [3/3] Dang nap toan bo Schema va Du lieu nen tang (tn_edu_complete_init.sql)...
psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DB% -f "%~dp0..\database\tn_edu_complete_init.sql"
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Nap CSDL that bai! Vui long kiem tra lai mat khau PostgreSQL.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================================
echo    KHOI TAO CSDL THANH CONG!
echo    Tai khoan Quan tri Nen tang (System Admin):
echo    - Tai khoan: 0913016667 (hoac chunh@tringhiatech.vn)
echo    - Mat khau:  123456
echo ======================================================================
echo.
pause
