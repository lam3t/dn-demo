#!/usr/bin/env bash
# ========================================================
# SCRIPT CẬP NHẬT PHIÊN BẢN MỚI TRÊN SERVER (LINUX / UBUNTU)
# ========================================================
set -e

echo "=================================================="
echo "🔄 BẮT ĐẦU CẬP NHẬT HỆ THỐNG TRƯỜNG HỌC TN_EDU..."
echo "=================================================="

# 1. Kéo code mới nhất từ git
echo "📥 1/3: Kéo mã nguồn mới từ Git repository..."
git pull origin main

# 2. Build lại các container
echo "🐳 2/3: Biên dịch & Khởi động lại Docker containers..."
cd deploy-package
docker compose down
docker compose up -d --build

# 3. Dọn dẹp cache / image cũ
echo "🧹 3/3: Dọn dẹp Docker images rác..."
docker image prune -f

echo "=================================================="
echo "✅ HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG!"
echo "🌐 Truy cập giao diện: http://<IP_SERVER>:80"
echo "=================================================="
