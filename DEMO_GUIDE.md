# 🏫 HƯỚNG DẪN CHẠY VÀ KỊCH BẢN TRÌNH DIỄN DEMO — HỆ THỐNG TN EDU
**Phần mềm Quản lý Kế hoạch & Phân công Công việc Trường Phổ thông**  
*Mô hình thí điểm: Trường THCS Phước Tân (1 Trường chính + 2 Phân hiệu, 8 Tổ chuyên môn, 42 Cán bộ Giáo viên)*

---

## 1. ⚙️ Yêu cầu môi trường & Cài đặt

### Yêu cầu hệ thống:
- **Node.js**: Phiên bản 18+ hoặc 20+ LTS
- **PostgreSQL**: Đã tích hợp sẵn daemon Embedded PostgreSQL tự động (hoặc PostgreSQL local port 5432)
- **Nền tảng**: Windows / macOS / Linux

### Các bước khởi động hệ thống:

#### Bước 1: Khởi động CSDL & Backend API
```bash
cd backend
# 1. Cài đặt dependencies (nếu chưa cài)
npm install

# 2. Khởi tạo schema và nạp dữ liệu mẫu 42 nhân sự 3 điểm trường
npm run prisma:generate
npm run prisma:seed

# 3. Nạp kịch bản demo trình diễn (Prompt 20)
npm run db:seed:demo

# 4. Chạy Backend server (cổng 5000)
npm run dev
```
> Backend API hoạt động tại: `http://localhost:5000/api`

#### Bước 2: Khởi động Giao diện Frontend (Angular 22)
```bash
cd frontend
# 1. Cài đặt dependencies (nếu chưa cài)
npm install

# 2. Chạy Frontend server (cổng 4200)
npm start
```
> Truy cập ứng dụng tại: `http://localhost:4200`

---

## 2. 👥 Danh sách Tài khoản Demo theo Vai trò

Tất cả tài khoản đều sử dụng **Mật khẩu chung: `123456`**

| STT | Họ và Tên | Vai trò | Điểm trường | SĐT / Tài khoản | Ghi chú kịch bản demo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Nguyễn Văn An** | **Hiệu trưởng** | Điểm chính (Trung tâm) | `0903111222` | **Tài khoản chính xem Dashboard & Giám sát** |
| **2** | **Trần Thị Bích Mai** | **Phó Hiệu trưởng** | Điểm chính (Chuyên môn) | `0903222333` | Quản lý kế hoạch chuyên môn |
| **3** | **Lê Hoàng Long** | **Phó Hiệu trưởng** | Phân hiệu 1 (Tân Lập) | `0903333444` | Quản trị điều hành Phân hiệu 1 |
| **4** | **Phạm Quốc Tuấn** | **Phó Hiệu trưởng** | Phân hiệu 2 (Vườn Dừa) | `0903444555` | Quản trị điều hành Phân hiệu 2 |
| **5** | **Vũ Đình Dũng** | **Tổ trưởng Toán - Tin** | Điểm chính | `0912111001` | **Tổ trưởng kiểm tra / nghiệm thu việc** |
| **6** | **Bùi Thị Hồng Nhung** | **Giáo viên Toán** | Phân hiệu 1 (Tân Lập) | `0914202001` | Chủ trì việc quá hạn (Cần gọi điện đôn đốc) |
| **7** | **Lê Hữu Nghĩa** | **Giáo viên Toán** | Phân hiệu 2 (Vườn Dừa) | `0915303001` | Chủ trì việc niêm phong túi đề thi HK1 |
| **8** | **Bùi Thanh Tùng** | **Quản trị hệ thống** | Toàn trường | `0909999999` | Quản trị Admin |

---

## 3. 🎯 Kịch bản Trình diễn 5 Phút (Giải quyết 5 Nỗi đau của BGH)

```
       ┌────────────────────────────────────────────────────────┐
       │   5 VẤN ĐỀ CỐT LÕI CỦA TRƯỜNG SAU SÁP NHẬP ĐƯỢC GIẢI QUYẾT:    │
       │   1. Đứt gãy thông tin liên lạc 3 điểm trường (Click-to-Call) │
       │   2. Khó phân định trách nhiệm rõ ràng (Mô hình RACI)   │
       │   3. Không biết việc đang tắc ở ai (Điểm nghẽn nút chai)│
       │   4. Thiếu minh chứng kết quả nghiệm thu (File Dropzone) │
       │   5. Kế hoạch trên giấy khó số hóa (Bảng giấy 3 cột)    │
       └────────────────────────────────────────────────────────┘
```

### 🔹 BƯỚC 1 (1 phút): Đăng nhập Hiệu trưởng & Tổng quan điều hành (Dashboard)
1. Truy cập `http://localhost:4200`, đăng nhập số điện thoại: **`0903111222`** / Mật khẩu: **`123456`**.
2. Chọn vai trò **"Hiệu trưởng – Điểm chính"** để vào thẳng Dashboard.
3. **Điểm nhấn trình diễn:**
   - Xem 4 thẻ chỉ số lớn: *Tổng số việc (100+), Đang làm, Hoàn thành, và Việc quá hạn*.
   - Mục **"Danh sách việc cần quan tâm"**: Thấy ngay công việc `[CV-DEMO-02]` *"Tổng hợp danh sách học sinh cần phụ đạo yếu kém trước thi HK1"* đang **quá hạn 3 ngày** tại Phân hiệu 1.
   - Bấm nút **GỌI ĐIỆN NGAY (`tel:0914202001`)** trên thẻ hoặc bấm vào avatar cô *Bùi Thị Hồng Nhung* để mở **Contact Mini-Card** gọi điện thoại hoặc gửi Zalo đôn đốc trực tiếp.
   - Thử chuyển bộ lọc dropdown trên cùng sang **"Phân hiệu 1"** hoặc **"Phân hiệu 2"** để thấy biểu đồ tiến độ cập nhật tự động.

---

### 🔹 BƯỚC 2 (1 phút): Giải quyết "Điểm nghẽn nút chai" — Theo dõi & Phê duyệt
1. Nhấp menu bên trái chọn **"Tất cả công việc"** (`/tasks`).
2. Xem thanh tab trạng thái `StatusTabsCounterComponent`:
   - Bấm vào tab **"Chờ kiểm tra"** (màu vàng cam).
   - Thấy ngay công việc `[CV-DEMO-01]` *"Bàn giao và niêm phong túi đề kiểm tra HK1 tại Phân hiệu 2 (Vườn Dừa)"*.
3. **Điểm nhấn trình diễn:**
   - Cột **"Người đang giữ việc"**: Thể hiện rõ người chịu trách nhiệm bước này là **Tổ trưởng Vũ Đình Dũng** (Kiểm tra/Nghiệm thu).
   - Cột **"Thời gian ở trạng thái"**: Thể hiện số ngày việc đang nằm tại bàn của ai, giúp Ban Giám hiệu phát hiện điểm nghẽn ngay tức khắc mà không cần họp hỏi.

---

### 🔹 BƯỚC 3 (1 phút): Số hóa bảng kế hoạch giấy quen thuộc của giáo viên
1. Nhấp menu chọn **"Kế hoạch"** (`/plans`).
2. **Tab 1 — Cây Kế hoạch Lồng nhau (Plan Tree):**
   - Xem cây kế hoạch phân cấp chuẩn: *Năm học 2026-2027 $\rightarrow$ Học kỳ I $\rightarrow$ Tuần 1, Tuần 2, Tuần 3*.
   - Bấm mở rộng Tuần 2: Thấy danh sách công việc con trực thuộc ngay bên trong node cây.
3. **Tab 2 — Số hóa Kế hoạch (Bảng giấy 3 cột):**
   - Chuyển sang tab số 2: Giao diện mô phỏng **ĐÚNG 3 CỘT** trên sổ tay giáo viên: *"1. Thời gian"*, *"2. Nội dung trọng tâm"*, *"3. Kết quả cần đạt"*.
   - Bấm nút **"+ Thêm dòng kế hoạch tiếp theo"** và nhập nhanh 1 mốc công việc mới.
   - Sau khi lưu dòng, bấm nút **"Tạo công việc từ dòng này →"**: Hệ thống lập tức mở Wizard giao việc với tên việc, mô tả và ngày hoàn thành đã được điền sẵn 100%!

---

### 🔹 BƯỚC 4 (1 phút): Trải nghiệm Wizard Giao việc RACI 3 bước
1. Tại bất kỳ đâu, bấm nút **"+ Giao việc mới"** (hoặc nút FAB trên mobile):
   - **Bước 1 — Thông tin việc**: Bấm chọn 1 mẫu có sẵn (VD: *"Kiểm tra an toàn hệ thống PCCC và thiết bị điện"*), chọn mức ưu tiên *(Bình thường / Quan trọng / Khẩn cấp)*, tích chọn *"Yêu cầu minh chứng bắt buộc"*.
   - **Bước 2 — Phân công RACI**:
     - Ô **Chủ trì**: Gõ tìm kiếm và chọn 1 giáo viên phụ trách chính. Chấm tròn màu *(Xanh = ít việc, Vàng = vừa, Đỏ = quá tải)* giúp BGH tránh giao dồn việc cho 1 người.
     - Ô **Phối hợp**: Chọn thêm 1-2 giáo viên phối hợp liên phân hiệu.
     - Ô **Kiểm tra**: Chọn Tổ trưởng phụ trách nghiệm thu.
   - **Bước 3 — Xác nhận**: Xem tóm tắt phiếu giao việc và bấm **"XÁC NHẬN GIAO VIỆC NGAY"**.
2. Hệ thống tạo task, gán quyền RACI và kích hoạt thông báo tự động.

---

### 🔹 BƯỚC 5 (1 phút): Tổ trưởng nghiệm thu minh chứng & Đóng công việc
1. Đăng xuất và đăng nhập vai trò **Tổ trưởng Vũ Đình Dũng** (`0912111001` / `123456`).
2. Vào **"Việc của tôi"** (`/my-tasks`):
   - Mở công việc `[CV-DEMO-01]` đang ở tab *"Chờ tôi xác nhận"*.
   - Xem chi tiết: Thấy tệp minh chứng *"Biên bản niêm phong tủ đề thi HK1 - Phân hiệu 2.pdf"* do giáo viên Phân hiệu 2 tải lên.
   - Xem dòng thời gian **Timeline Nhật ký**: Ghi nhận minh bạch từng mốc lịch sử ai làm, vào giờ nào.
   - Bấm nút **"Xác nhận đạt / Hoàn thành"** $\rightarrow$ Trạng thái chuyển `HOAN_THANH`, tiến độ tự động cập nhật 100% và lan truyền lên cây kế hoạch cha!

---

## 4. 📱 Thử nghiệm Giao diện Di động (Mobile / Responsive)

Hệ thống tối ưu 100% cho điện thoại giáo viên:
- Mở **F12 $\rightarrow$ Toggle Device Toolbar (375px - iPhone SE)**.
- Giao diện tự động chuyển thành **Bottom Navigation Bar 4 mục** + **Nút tạo việc nổi (+ FAB)**.
- Mọi bảng dữ liệu tự động chuyển thành **Thẻ dọc (Cards)** dễ vuốt chạm bằng một ngón tay.
- Mọi số điện thoại giáo viên và BGH đều hỗ trợ **1-Chạm gọi ngay (`tel:`)** không cần lưu danh bạ.

---
*TN EDU — Nền tảng số hóa quản trị công việc toàn diện cho nhà trường phổ thông hiện đại.*
