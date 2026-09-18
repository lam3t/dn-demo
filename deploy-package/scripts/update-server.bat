@echo off
chcp 65001 >nul
echo ==================================================
echo 🔄 BẮT ĐẦU CẬP NHẬT HỆ THỐNG TRƯỜNG HỌC TN_EDU...
echo ==================================================

echo 📥 1/3: Kéo mã nguồn mới từ Git repository...
git pull origin main

echo 🐳 2/3: Biên dịch & Khởi động lại Docker containers...
cd deploy-package
docker compose down
docker compose up -d --build

echo 🧹 3/3: Dọn dẹp Docker images rác...
docker image prune -f

echo ==================================================
echo ✅ HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG!
echo 🌐 Truy cập: http://localhost:80
echo ==================================================
pause
