@echo off
setlocal enabledelayedexpansion
title TN EDU - Sao luu CSDL PostgreSQL tu dong

rem 1. Tu dong tim duong dan pg_dump tren Windows Server
where pg_dump >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\17\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\15\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\14\bin;%PATH%"
)

set PG_HOST=localhost
set PG_PORT=5432
set PG_USER=postgres
set PG_DB=tn_edu

if not exist "%~dp0..\backups" mkdir "%~dp0..\backups"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%
set BACKUP_FILE=%~dp0..\backups\tn_edu_backup_%TIMESTAMP%.sql

echo Dang tien hanh sao luu database "%PG_DB%" vao:
echo %BACKUP_FILE%
echo.

pg_dump -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DB% -F p -b -v -f "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo SAO LUU DU LIEU THANH CONG!
    echo File: %BACKUP_FILE%
    echo ======================================================================
) else (
    echo.
    echo [LOI] Sao luu du lieu that bai!
)

timeout /t 5
