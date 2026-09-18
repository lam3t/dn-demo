# CẨM NANG HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG TN EDU LÊN WINDOWS SERVER

Tài liệu hướng dẫn chi tiết từng bước từ cài đặt môi trường, cấu hình Cơ sở dữ liệu PostgreSQL, khởi chạy Backend API, triển khai Frontend và thiết lập Web Server (Nginx / IIS) trên môi trường **Windows Server (2016 / 2019 / 2022 / Windows 10/11 Pro)**.

---

## MỤC LỤC
1. [Cấu trúc Gói Triển Khai](#1-cấu-trúc-gói-triển-khai)
2. [Yêu cầu Môi trường & Phần mềm cần cài](#2-yêu-cầu-môi-trường--phần-mềm-cần-cài)
3. [Bước 1: Cài đặt & Khởi tạo CSDL PostgreSQL](#bước-1-cài-đặt--khởi-tạo-csdl-postgresql)
4. [Bước 2: Cấu hình & Khởi chạy Backend API](#bước-2-cấu-hình--khởi-chạy-backend-api)
5. [Bước 3: Triển khai Frontend & Web Server (Nginx hoặc IIS)](#bước-3-triển-khai-frontend--web-server-nginx-hoặc-iis)
   - [Cách 1: Triển khai bằng Nginx for Windows (Khuyên dùng)](#cách-1-triển-khai-bằng-nginx-for-windows-khuyên-dùng)
   - [Cách 2: Triển khai bằng Microsoft IIS](#cách-2-triển-khai-bằng-microsoft-iis)
6. [Bước 4: Mở Port trên Windows Defender Firewall](#bước-4-mở-port-trên-windows-defender-firewall)
7. [Bước 5: Thiết lập Tự Động Sao Lưu Dữ Liệu (Backup)](#bước-5-thiết-lập-tự-động-sao-lưu-dữ-liệu-backup)
8. [Thông tin Đăng nhập & Vận hành Ban đầu](#thông-tin-đăng-nhập--vận-hành-ban-đầu)

---

## 1. Cấu trúc Gói Triển Khai

Sau khi giải nén gói `deploy-package.zip`, bạn sẽ có cấu trúc thư mục như sau:

```
deploy-package/
├── frontend/
│   └── dist/                     # Toàn bộ file tĩnh Production của Frontend Angular
├── backend/
│   ├── dist/                     # Mã nguồn JavaScript Node.js đã build
│   ├── prisma/
│   │   └── schema.prisma         # Schema dữ liệu Prisma
│   ├── package.json              # File định nghĩa thư viện runtime
│   ├── .env.example              # Mẫu cấu hình môi trường
│   └── ecosystem.config.js       # File cấu hình PM2 quản lý tiến trình
├── database/
│   ├── 01_schema.sql             # SQL tạo toàn bộ Bảng, Index, Khóa ngoại
│   └── 02_baseline_seed.sql      # SQL nạp 60 Quyền, 2 Gói dịch vụ & TK System Admin
├── scripts/
│   ├── 1-setup-database.bat      # Script khởi tạo Database 1 chạm
│   ├── 2-start-backend.bat       # Script khởi chạy Backend nhanh
│   └── 3-backup-database.bat     # Script sao lưu CSDL tự động
└── WINDOWS_SERVER_DEPLOYMENT_GUIDE.md
```

---

## 2. Yêu cầu Môi trường & Phần mềm cần cài

Tải và cài đặt các phần mềm sau trên Windows Server:

1. **Node.js LTS (v20.x hoặc v22.x)**: 
   - Tải file `.msi` tại: [https://nodejs.org/](https://nodejs.org/)
   - Khi cài đặt, tick chọn *"Automatically install the necessary tools"*.
2. **PostgreSQL (v15.x hoặc v16.x)**:
   - Tải file cài đặt tại: [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
   - Lưu lại **Mật khẩu của tài khoản `postgres`** (ví dụ: `Password123@`).
   - Cổng mặc định: `5432`.
3. **PM2 (Quản lý tiến trình Backend chạy ngầm)**:
   - Mở **PowerShell (Administrator)** và chạy lệnh:
     ```powershell
     npm install -g pm2 pm2-windows-service
     ```
4. **Web Server**: Chọn **Nginx for Windows** (khuyên dùng) hoặc **IIS**.

---

## Bước 1: Cài đặt & Khởi tạo CSDL PostgreSQL

### Cách A (Khuyên dùng - Sử dụng Script tự động):
1. Vào thư mục `scripts/`.
2. Click đúp chuột vào file **`1-setup-database.bat`**.
3. Nhập mật khẩu tài khoản `postgres` khi được hỏi. Script sẽ tự động tìm `psql`, tạo CSDL `tn_edu` và nạp toàn bộ dữ liệu.

### Cách B (Thủ công 1 bước bằng pgAdmin 4):
1. Mở công cụ **pgAdmin 4**.
2. Chuột phải vào `Databases` -> Chọn `Create` -> `Database...` -> Đặt tên là `tn_edu` -> Bấm `Save`.
3. Chuột phải vào database `tn_edu` vừa tạo -> Chọn **Query Tool**.
4. Mở file **`database/tn_edu_complete_init.sql`** (đã gộp sẵn cả Schema và Seed chuẩn) -> Nhấn **Execute (F5)**.
5. Kiểm tra thông báo: `Query returned successfully` là xong!

---

## Bước 2: Cấu hình & Khởi chạy Backend API

### 1. Cấu hình biến môi trường
1. Vào thư mục `backend/`.
2. Sao chép file `.env.example` thành file **`.env`**.
3. Mở file `.env` bằng Notepad và chỉnh sửa chuỗi kết nối Database phù hợp với mật khẩu của bạn:
   ```env
   PORT=5000
   NODE_ENV=production
   
   # Thay "YourSecurePassword123" bằng mật khẩu PostgreSQL thực tế của bạn
   DATABASE_URL="postgresql://postgres:YourSecurePassword123@localhost:5432/tn_edu?schema=public&connection_limit=20"
   DIRECT_URL="postgresql://postgres:YourSecurePassword123@localhost:5432/tn_edu?schema=public"
   
   JWT_SECRET="tn_edu_super_prod_secret_2026_jwt_token_secure"
   JWT_REFRESH_SECRET="tn_edu_super_prod_refresh_secret_2026_secure"
   JWT_ACCESS_EXPIRES_IN="7d"
   JWT_REFRESH_EXPIRES_IN="30d"
   
   CORS_ORIGIN="http://localhost,http://127.0.0.1,http://localhost:80"
   ```

### 2. Cài đặt Dependencies & Sinh Prisma Client
Mở cửa sổ Command Prompt (CMD) tại thư mục `backend/` và chạy:
```cmd
npm install --omit=dev
npx prisma generate
```

### 3. Khởi chạy Backend

#### Tùy chọn 1: Chạy thử nhanh bằng Batch Script
- Chạy file `scripts/2-start-backend.bat`. Backend sẽ lắng nghe tại `http://localhost:5000`.

#### Tùy chọn 2: Chạy Service nền vĩnh viễn bằng PM2 (Khuyên dùng cho Production)
Mở PowerShell (Administrator) tại thư mục `backend/`:
```powershell
# 1. Khởi chạy ứng dụng qua PM2
pm2 start ecosystem.config.js

# 2. Lưu trạng thái PM2
pm2 save

# 3. Cài đặt tự khởi động cùng Windows Server khi reboot máy
pm2-service-install -n "TN_EDU_Backend"
```
*Lưu ý:* Để xem log của backend, chạy `pm2 logs tn-edu-backend`. Để xem trạng thái, chạy `pm2 status`.

---

## Bước 3: Triển khai Frontend & Web Server (Nginx hoặc IIS)

---

### Cách 1: Triển khai bằng Nginx for Windows (Khuyên dùng)

1. Tải Nginx for Windows tại: [https://nginx.org/en/download.html](https://nginx.org/en/download.html) (ví dụ bản `nginx/Windows-1.24.x`).
2. Giải nén vào ổ đĩa, ví dụ: `C:\nginx`.
3. Sao chép toàn bộ nội dung trong thư mục `deploy-package/frontend/dist/` vào thư mục `C:\nginx\html\tn-edu\`.
4. Mở file `C:\nginx\conf\nginx.conf`, thay thế khối `server { ... }` bằng cấu hình chuẩn sau:

```nginx
server {
    listen       80;
    server_name  localhost qlgd.yourdomain.edu.vn;

    # Gzip nén dữ liệu cho tốc độ tối đa
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # 1. Định tuyến Frontend Angular (SPA HTML5 Routing)
    location / {
        root   C:/nginx/html/tn-edu;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy chuyển toàn bộ request /api sang Backend Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # 3. Thư mục tải lên minh chứng / file đính kèm
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
    }
}
```

5. Khởi động Nginx:
   Mở Command Prompt tại `C:\nginx` và chạy:
   ```cmd
   start nginx
   ```
   *(Để nạp lại cấu hình: `nginx -s reload`, để dừng: `nginx -s stop`)*.

---

### Cách 2: Triển khai bằng Microsoft IIS

1. Mở **Server Manager** -> **Add Roles and Features** -> Cài đặt **Web Server (IIS)**.
2. Tải và cài đặt 2 module bổ trợ bắt buộc cho IIS:
   - **URL Rewrite Module**: [Tải tại Microsoft](https://www.iis.net/downloads/microsoft/url-rewrite)
   - **Application Request Routing (ARR)**: [Tải tại Microsoft](https://www.iis.net/downloads/microsoft/application-request-routing)
3. Bật tính năng Proxy trong ARR:
   - Mở **IIS Manager** -> Click vào tên Server -> Click **Application Request Routing Cache** -> **Server Proxy Settings** (cột phải) -> Tick chọn **Enable proxy** -> Nhấn **Apply**.
4. Tạo Website mới trong IIS:
   - Chuột phải vào `Sites` -> **Add Website...**.
   - Site name: `TN_EDU`.
   - Physical path: Trỏ tới thư mục `deploy-package\frontend\dist`.
   - Binding: Port `80` (hoặc domain của bạn).
5. Tạo file `web.config` ngay trong thư mục `deploy-package\frontend\dist\` với nội dung sau:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Chuyển hướng /api sang Backend Node.js port 5000 -->
        <rule name="ReverseProxyToAPI" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/api/{R:1}" />
        </rule>
        
        <!-- Chuyển hướng /uploads sang Backend -->
        <rule name="ReverseProxyToUploads" stopProcessing="true">
          <match url="^uploads/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/uploads/{R:1}" />
        </rule>

        <!-- SPA Routing cho Angular -->
        <rule name="AngularRoutes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

---

## Bước 4: Mở Port trên Windows Defender Firewall

Mở **PowerShell (Administrator)** và chạy các lệnh sau để cho phép máy trạm khác trong mạng LAN/Internet truy cập vào hệ thống:

```powershell
# Mở Port 80 (HTTP)
New-NetFirewallRule -DisplayName "TN_EDU_HTTP_80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Mở Port 443 (HTTPS - nếu cài SSL)
New-NetFirewallRule -DisplayName "TN_EDU_HTTPS_443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## Bước 5: Thiết lập Tự Động Sao Lưu Dữ Liệu (Backup)

1. Mở công cụ **Task Scheduler** trên Windows Server (`taskschd.msc`).
2. Chọn **Create Basic Task...**
   - Name: `TN_EDU_Daily_Database_Backup`.
   - Trigger: Chọn **Daily** (Chạy hàng ngày lúc 23:00 đêm).
   - Action: Chọn **Start a program**.
   - Program/script: Trỏ đến file `scripts\3-backup-database.bat`.
   - Start in: Nhập đường dẫn thư mục `scripts` (ví dụ `C:\TN_EDU\scripts`).
3. Nhấn **Finish**. Hàng ngày hệ thống sẽ tự động xuất file `.sql` sao lưu lưu vào thư mục `backups/`.

---

## Thông tin Đăng nhập & Vận hành Ban đầu

Truy cập hệ thống qua trình duyệt: `http://localhost` (hoặc `http://<IP_MÁY_CHỦ>`).

### Tài khoản Quản trị Nền tảng SaaS (System Admin):
- **Tài khoản**: `0913016667` *(hoặc `chunh@tringhiatech.vn`)*
- **Mật khẩu**: `123456`

### Quy trình tạo Trường học (Tenant) thật đầu tiên:
1. Đăng nhập bằng tài khoản **System Admin** ở trên.
2. Hệ thống sẽ tự động chuyển tới giao diện Quản trị Nền tảng SaaS (`/system-admin`).
3. Nhấn nút **"+ Thêm trường học mới"**.
4. Nhập đầy đủ thông tin:
   - Tên trường (ví dụ: *Trường THPT Chuyên Hùng Vương*).
   - Mã trường (ví dụ: *THPT_CHV*).
   - Gói dịch vụ: *Gói Cơ bản (Standard)* hoặc *Gói Nâng cao (Enterprise)*.
   - Họ tên và Số điện thoại / Email của **Hiệu trưởng / Quản trị viên trường**.
   - Mật khẩu khởi tạo.
5. Nhấn **"Khởi tạo Tenant"**.
6. Đăng xuất và sử dụng tài khoản Admin trường vừa tạo để đăng nhập vào không gian điều hành trường học thật!
