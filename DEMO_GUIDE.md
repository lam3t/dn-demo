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
| **1** | **Phạm Thị Nam** | **Hiệu trưởng** | Điểm chính (Trung tâm) | `0903111222` | **Tài khoản chính xem Dashboard & Giám sát** |
| **2** | **Trần Thị Bích Mai** | **Phó Hiệu trưởng** | Điểm chính (Chuyên môn) | `0903222333` | Quản lý kế hoạch chuyên môn |
| **3** | **Lê Hoàng Long** | **Phó Hiệu trưởng** | Phân hiệu 1 (Tân Lập) | `0903333444` | Quản trị điều hành Phân hiệu 1 |
| **4** | **Phạm Quốc Tuấn** | **Phó Hiệu trưởng** | Phân hiệu 2 (Vườn Dừa) | `0903444555` | Quản trị điều hành Phân hiệu 2 |
| **5** | **Vũ Đình Dũng** | **Tổ trưởng Toán - Tin** | Điểm chính | `0912111001` | **Tổ trưởng kiểm tra / nghiệm thu việc** |
| **6** | **Bùi Thị Hồng Nhung** | **Giáo viên Toán** | Phân hiệu 1 (Tân Lập) | `0914202001` | Chủ trì việc quá hạn (Cần gọi điện đôn đốc) |
| **7** | **Lê Hữu Nghĩa** | **Giáo viên Toán** | Phân hiệu 2 (Vườn Dừa) | `0915303001` | Chủ trì việc niêm phong túi đề thi HK1 |
| **8** | **Bùi Thanh Tùng** | **Quản trị hệ thống** | Toàn trường | `0909999999` | Quản trị Admin |

---

## 3. 🎯 Kịch bản Trình diễn 5 Phút (Giải quyết 5 Khó khăn của Nhà trường)

```
       ┌────────────────────────────────────────────────────────┐
       │   5 VẤN ĐỀ CỐT LÕI CỦA TRƯỜNG SAU SÁP NHẬP ĐƯỢC GIẢI QUYẾT:    │
       │   1. Phân tán giữa 3 điểm trường xa (Bấm gọi trực tiếp)       │
       │   2. Phân công việc chưa rõ trách nhiệm (Rõ người - rõ việc)  │
       │   3. Không biết việc đang tắc ở khâu nào (Ai đang giữ việc)    │
       │   4. Thiếu minh chứng kết quả nghiệm thu (Tệp đính kèm)       │
       │   5. Thói quen sổ sách giấy (Lịch công tác tuần 3 cột)        │
       └────────────────────────────────────────────────────────┘
```

### 🔹 BƯỚC 1 (1 phút): Đăng nhập Hiệu trưởng & Tổng quan Tiến độ Nhà trường
1. Truy cập `http://localhost:4200` hoặc Vercel, đăng nhập: **`0903111222`** / Mật khẩu: **`123456`**.
2. Chọn vai trò **"Hiệu trưởng – Điểm chính"** để vào màn hình Tổng quan điều hành.
3. **Điểm nhấn trình diễn:**
   - Xem 4 ô chỉ số: *Tổng số việc, Đang thực hiện, Đã hoàn thành, và Việc quá hạn*.
   - Mục **"Việc cần chú ý / Đang quá hạn"**: Thấy công việc `[CV-DEMO-02]` *"Tổng hợp danh sách học sinh cần phụ đạo yếu kém trước thi HK1"* đang **quá hạn 3 ngày** tại Phân hiệu 1.
   - Bấm nút **GỌI ĐIỆN NGAY (`tel:0914202001`)** trên thẻ hoặc bấm vào avatar cô *Bùi Thị Hồng Nhung* để mở thẻ liên hệ và gọi điện thoại/nhắn Zalo đôn đốc trực tiếp.
   - Thử chuyển bộ lọc trên cùng sang **"Phân hiệu 1"** hoặc **"Phân hiệu 2"** để thấy biểu đồ tiến độ cập nhật tức thì.

---

### 🔹 BƯỚC 2 (1 phút): Theo dõi Ai đang giữ việc & Đôn đốc Kịp thời
1. Nhấp menu bên trái chọn **"Tất cả công việc"** (`/tasks`).
2. Xem thanh tab trạng thái:
   - Bấm vào tab **"Chờ kiểm tra"** (màu vàng cam).
   - Thấy ngay công việc `[CV-DEMO-01]` *"Bàn giao và niêm phong túi đề kiểm tra HK1 tại Phân hiệu 2 (Vườn Dừa)"*.
3. **Điểm nhấn trình diễn:**
   - Cột **"Người đang giữ việc"**: Thể hiện rõ người chịu trách nhiệm bước này là **Tổ trưởng Vũ Đình Dũng** (Kiểm tra/Nghiệm thu).
   - Cột **"Thời gian chờ"**: Thể hiện số ngày việc đang nằm tại bàn của ai, giúp Ban Giám hiệu nắm bắt ngay mà không cần họp hỏi.

---

### 🔹 BƯỚC 3 (1 phút): Kế hoạch Năm học & Lịch Công tác Tuần Thân quen
1. Nhấp menu chọn **"Kế hoạch"** (`/plans`).
2. **Tab 1 — Kế hoạch Năm học (Năm → Tuần):**
   - Xem kế hoạch phân cấp chuẩn: *Năm học 2026-2027 $\rightarrow$ Học kỳ I $\rightarrow$ Tuần 1, Tuần 2, Tuần 3*.
   - Bấm mở rộng Tuần 2: Thấy danh sách công việc trực thuộc ngay bên trong mốc kế hoạch.
3. **Tab 2 — Lịch Công tác Tuần (Dạng Bảng 3 Cột):**
   - Chuyển sang tab số 2: Giao diện giữ nguyên **ĐÚNG 3 CỘT** trên sổ tay giáo viên: *"1. Thời gian"*, *"2. Nội dung trọng tâm"*, *"3. Kết quả cần đạt"*.
   - Bấm nút **"+ Thêm dòng kế hoạch tiếp theo"** và nhập nhanh 1 dòng kế hoạch mới.
   - Sau khi lưu dòng, bấm nút **"Tạo công việc từ dòng này →"**: Hệ thống lập tức mở phiếu giao việc với tên việc, nội dung và thời hạn đã được điền sẵn 100%!

---

### 🔹 BƯỚC 4 (1 phút): Phiếu Giao việc 3 Bước Rõ Người - Rõ Việc
1. Tại bất kỳ đâu, bấm nút **"+ Giao việc mới"** (hoặc nút tròn nổi trên điện thoại):
   - **Bước 1 — Thông tin việc**: Bấm chọn 1 mẫu có sẵn (VD: *"Kiểm tra an toàn hệ thống PCCC và thiết bị điện"*), chọn mức ưu tiên *(Bình thường / Quan trọng / Khẩn cấp)*, tích chọn *"Bắt buộc đính kèm minh chứng"*.
   - **Bước 2 — Phân công nhân sự**:
     - Ô **Người chủ trì**: Chọn 1 giáo viên phụ trách chính. Chấm tròn màu *(Xanh = đang rảnh, Vàng = vừa phải, Đỏ = nhiều việc)* giúp BGH phân công hợp lý.
     - Ô **Người phối hợp**: Chọn thêm 1-2 giáo viên cùng hỗ trợ.
     - Ô **Người kiểm tra**: Chọn Tổ trưởng phụ trách nghiệm thu.
   - **Bước 3 — Xác nhận**: Xem tóm tắt phiếu giao việc và bấm **"XÁC NHẬN GIAO VIỆC"**.
2. Hệ thống tạo công việc, gán đúng vai trò và gửi thông báo nhắc việc.

---

### 🔹 BƯỚC 5 (1 phút): Tổ trưởng Kiểm tra Minh chứng & Duyệt Hoàn thành
1. Đăng xuất và đăng nhập tài khoản **Tổ trưởng Vũ Đình Dũng** (`0912111001` / `123456`).
2. Vào **"Việc của tôi"** (`/my-tasks`):
   - Mở công việc `[CV-DEMO-01]` đang ở tab *"Chờ tôi xác nhận"*.
   - Xem chi tiết: Thấy tệp minh chứng *"Biên bản niêm phong tủ đề thi HK1 - Phân hiệu 2.pdf"* do giáo viên Phân hiệu 2 đã gửi.
   - Xem dòng thời gian **Nhật ký**: Ghi nhận minh bạch lịch sử từng bước ai làm, vào lúc nào.
   - Bấm nút **"Xác nhận đạt / Hoàn thành"** $\rightarrow$ Trạng thái chuyển `HOAN_THANH`, tiến độ tự động cập nhật 100% và cộng dồn vào tiến độ kế hoạch năm học!

---

## 4. 📱 Trải nghiệm Thân thiện Trên Điện thoại Di động

Hệ thống tối ưu 100% cho điện thoại của thầy cô giáo:
- Mở **F12 $\rightarrow$ Toggle Device Toolbar (375px - iPhone SE)**.
- Giao diện tự động chuyển thành **Thanh điều hướng dưới đáy (4 mục)** + **Nút tạo việc nổi (+ FAB)**.
- Mọi bảng dữ liệu tự động chuyển thành **Thẻ dọc gọn gàng (Cards)** dễ vuốt chạm bằng một ngón tay.
- Mọi số điện thoại giáo viên và BGH đều hỗ trợ **1-Chạm gọi ngay (`tel:`)** không cần lưu danh bạ.

---
*TN EDU — Giải pháp quản lý kế hoạch và phân công công việc thân thiện cho nhà trường phổ thông.*
