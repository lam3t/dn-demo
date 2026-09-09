# TN EDU – Quản lý Kế hoạch & Công việc Trường Phổ thông

Ứng dụng quản lý kế hoạch và điều hành công việc dành cho trường phổ thông liên cấp / nhiều điểm trường sau sáp nhập tại Việt Nam.

---

## 🚀 Cấu trúc Monorepo

```
school-management/
├── backend/            # Node.js + Express + TypeScript + Prisma ORM
│   ├── prisma/         # Prisma schema & seed data
│   ├── src/            # Source code (modules, middlewares, routes, services)
│   └── uploads/        # Lưu trữ file minh chứng cục bộ cho demo
├── frontend/           # Angular (Standalone Components) + Angular Material + CDK
│   └── src/app/        # Core, Shared components, Feature modules
├── docker-compose.yml  # Dịch vụ PostgreSQL cho môi trường phát triển
└── README.md           # Hướng dẫn chạy và triển khai
```

---

## 🛠️ Yêu cầu môi trường

- **Node.js**: v18+ (khuyên dùng Node.js 20 hoặc 22)
- **npm**: v9+
- **Docker & Docker Compose** (để chạy PostgreSQL)

---

## ⚡ Hướng dẫn cài đặt & Chạy dự án

### 1. Khởi động Cơ sở dữ liệu PostgreSQL (Docker)

```bash
docker compose up -d
```
> PostgreSQL sẽ chạy trên cổng `5432` với Database `tn_edu_db`, User `postgres`, Password `postgrespassword`.

---

### 2. Cài đặt Dependencies & Khởi chạy Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện
npm install

# Tạo Prisma Client và chạy migration
npx prisma generate
npx prisma migrate dev --name init

# (Tùy chọn) Chạy seed dữ liệu mẫu tiếng Việt
npm run prisma:seed

# Khởi động Backend server (chế độ phát triển)
npm run dev
```

* Backend API sẽ chạy tại: **`http://localhost:5000`**
* Kiểm tra Health-check: **`http://localhost:5000/api/health`**

---

### 3. Cài đặt Dependencies & Khởi chạy Frontend

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt thư viện
npm install

# Khởi động Angular dev server (đã cấu hình proxy /api sang backend)
npm start
# hoặc: npx ng serve --proxy-config proxy.conf.json
```

* Frontend Web App sẽ chạy tại: **`http://localhost:4200`**

---

## 🎨 Quy chuẩn Màu sắc Trạng thái & UX

- 🔵 **Xanh dương (`#1976D2`)**: Việc mới giao / Đang thực hiện
- 🟡 **Vàng cam (`#ED6C02`)**: Đang chờ xử lý / Chờ kiểm tra
- 🟠 **Cam đậm (`#D32F2F`)**: Bị trả lại / Cần bổ sung
- 🟢 **Xanh lá (`#2E7D32`)**: Đã hoàn thành / Đã xác nhận
- 🔴 **Đỏ (`#C62828`)**: Quá hạn thực hiện
- 📞 **Bấm-gọi-ngay**: Tích hợp liên kết `tel:` trực tiếp trên tất cả các vị trí hiển thị nhân sự liên quan.
