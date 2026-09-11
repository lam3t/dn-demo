# Bộ Prompt cho Antigravity — TN EDU Demo (Angular + Node.js)

Tài liệu này đi kèm `SRS_TN_EDU_Demo.docx`. Dùng chung với Antigravity (hoặc bất kỳ agentic
coding tool nào) để dựng ứng dụng demo.

## Cách dùng
1. Dán **Prompt 0 (System / Master context)** trước tiên trong một phiên làm việc mới — đây là
   "bộ nhớ nền" cho toàn bộ dự án, giúp AI không lạc hướng công nghệ/UX qua các bước sau.
2. Dán lần lượt **Prompt 1 → Prompt 22** theo đúng thứ tự, mỗi prompt là một bước build nhỏ,
   review kết quả (chạy thử) trước khi sang prompt kế tiếp.
   - Có 2 prompt bổ sung **4B** và **18B** (Cấu hình hệ thống: Tài khoản, Phân quyền, sửa
     Điểm trường, Giáo viên theo điểm trường) — dán **Prompt 4B ngay sau Prompt 4** (trước khi
     làm Prompt 5) và **Prompt 18B ngay sau Prompt 18** (trước khi làm Prompt 19). Giữ nguyên
     số thứ tự các prompt gốc còn lại để không phá vỡ các tham chiếu chéo (Prompt 10, 14...).
3. Có thể gộp 2-3 prompt liền kề nếu Antigravity xử lý tốt trong một lượt; nhưng KHÔNG nên
   gộp Backend và Frontend vào cùng một prompt vì dễ gây lẫn lộn ngữ cảnh.
4. Nếu AI đề xuất thêm phân hệ KPI/AI/tích hợp ngoài — nhắc lại rằng các phân hệ đó **ngoài
   phạm vi demo** (xem SRS mục 4.3) và yêu cầu bỏ qua.

---

## PROMPT 0 — System / Master Context (dán đầu tiên, giữ lại trong suốt phiên làm việc)

```
Bạn là kỹ sư phần mềm full-stack, xây dựng một ứng dụng DEMO tên "TN EDU – Quản lý Kế hoạch
& Công việc Trường Phổ thông" cho một trường liên cấp/nhiều điểm trường tại Việt Nam vừa
sáp nhập từ 3 trường thành 1 (mô hình một Ban Giám hiệu, nhiều điểm trường, 100-200 giáo
viên/nhân viên).

BỐI CẢNH NGHIỆP VỤ (bắt buộc đọc kỹ trước khi code):
Ban Giám hiệu sau sáp nhập gặp 5 vấn đề lớn nhất, mọi tính năng phải phục vụ trực tiếp
5 vấn đề này:
1. Giao việc phải thuận tiện, đơn giản dù số đầu mối (giáo viên/điểm trường) tăng lên nhiều.
2. Phải nắm nhanh tiến độ từng nhiệm vụ/kế hoạch.
3. Phải biết ngay đầu mối phối hợp là ai và gọi điện được luôn, không cần mở lại danh bạ.
4. Cập nhật kết quả/minh chứng phải cực kỳ nhanh và thuận tiện (kéo-thả file).
5. Luồng phê duyệt phải trực quan: nhìn là biết việc đang tắc/dừng ở ai, ở bước nào.

RÀNG BUỘC UX (ƯU TIÊN SỐ 1, quan trọng hơn cả tính năng):
- Người dùng phần lớn là giáo viên/nhân viên KHÔNG rành công nghệ → giao diện tiếng Việt,
  đơn giản, ít bước, không thuật ngữ kỹ thuật.
- Chọn người phụ trách phải nhanh trên danh sách 100-200 giáo viên (People Picker có
  tìm kiếm tức thời, avatar, hiển thị tải công việc hiện tại).
- Bắt buộc RESPONSIVE, ưu tiên MOBILE trước (điện thoại phổ thông, màn hình từ 360px),
  vì phần lớn giáo viên cập nhật công việc bằng điện thoại.
- Mọi nơi hiển thị tên người liên quan tới công việc phải có cách bấm-gọi-ngay
  (liên kết tel:), không bắt người dùng tự tra số điện thoại.
- Khu vực đính kèm minh chứng phải hỗ trợ kéo-thả (drag & drop) trên desktop và
  chụp ảnh/chọn ảnh trên mobile.
- Trạng thái công việc dùng màu nhất quán toàn hệ thống: xanh dương = mới/đang làm,
  vàng cam = đang chờ người khác xử lý, cam đậm = bị trả lại/cần bổ sung,
  xanh lá = hoàn thành, đỏ = quá hạn.

CÔNG NGHỆ BẮT BUỘC:
- Frontend: Angular (bản mới nhất, dùng standalone components, không dùng NgModule kiểu cũ),
  Angular Material HOẶC Tailwind CSS (chọn 1, dùng nhất quán), Angular CDK cho drag-drop.
- Backend: Node.js + Express (REST API), kiến trúc theo module
  (routes/controllers/services tách riêng theo domain).
- Database: PostgreSQL + Prisma ORM.
- Auth: JWT (access + refresh token), mật khẩu hash bằng bcrypt.
- Upload file: lưu local disk trong thư mục backend/uploads cho bản demo (không cần cloud
  storage thật).
- Toàn bộ code, tên biến có thể tiếng Anh, nhưng MỌI text hiển thị cho người dùng (label,
  placeholder, thông báo lỗi, tooltip) PHẢI bằng tiếng Việt.

CẤU TRÚC THƯ MỤC:
- Monorepo với 2 thư mục gốc: `backend/` và `frontend/`.
- backend/src/modules/{auth, users, orgunits, locations, plans, tasks, attachments,
  notifications, dashboard, admin}
- backend/prisma/schema.prisma
- frontend/src/app/core (auth guard, interceptor, models)
- frontend/src/app/shared/components/{people-picker, contact-mini-card, file-dropzone,
  status-badge, status-tabs-counter, plan-tree}
- frontend/src/app/features/{auth, dashboard, my-tasks, plans, tasks, org, notifications,
  admin-settings}

PHẠM VI (KHÔNG được tự ý thêm ngoài phạm vi này cho bản demo):
CÓ trong demo: đăng nhập/phân quyền cơ bản, cơ cấu tổ chức & điểm trường (bao gồm màn hình
tạo/sửa điểm trường), cấu hình hệ thống (quản lý tài khoản + gán vai trò/phân quyền theo
điểm trường-tổ), quản lý giáo viên/nhân viên theo điểm trường, danh bạ nhân sự + people
picker, kế hoạch nhiều cấp (Năm→Kỳ→Quý→Tháng→Tuần), công việc & giao việc kiểu RACI
(chủ trì/phối hợp/kiểm tra/phê duyệt/theo dõi), nhật ký & cập nhật tiến độ, đính kèm minh
chứng kéo-thả, workflow trạng thái kiểm tra-phê duyệt, liên hệ nhanh click-to-call, thông báo
trong app, dashboard điều hành, "Việc của tôi".
KHÔNG làm trong demo: KPI/đánh giá cá nhân/chuẩn nghề nghiệp, AI Copilot, OCR, tích hợp
SSO/Zalo/chữ ký số/CSDL ngành/LMS/lịch ngoài/webhook/API bên thứ ba, Data Warehouse/BI,
đa tenant thật (giả lập 1 trường duy nhất là đủ).

Hãy xác nhận bạn đã hiểu bối cảnh và ràng buộc này. Từ prompt tiếp theo, tôi sẽ yêu cầu bạn
xây dựng từng phần theo đúng phạm vi và nguyên tắc UX ở trên.
```

---

## PHẦN A — KHỞI TẠO & BACKEND

### PROMPT 1 — Khởi tạo dự án (scaffold)
```
Khởi tạo monorepo với 2 project:
1. `backend/`: Node.js + Express + TypeScript, cấu hình Prisma kết nối PostgreSQL
   (dùng biến môi trường DATABASE_URL trong .env), cấu hình CORS cho phép frontend
   gọi vào, middleware xử lý lỗi tập trung, health-check endpoint GET /api/health.
2. `frontend/`: Angular project mới (standalone components), cấu hình
   Angular Material (theme màu chủ đạo xanh dương đậm #1F3864 + xanh lá cho trạng thái
   hoàn thành), cấu hình proxy.conf.json trỏ /api sang backend khi chạy `ng serve`.
Thêm README.md hướng dẫn chạy cả 2 project (npm install, npm run dev) và file
docker-compose.yml chỉ chứa service postgres để dev nhanh.
```

### PROMPT 2 — Prisma schema & seed data
```
Viết backend/prisma/schema.prisma với các model sau (đặt tên field theo camelCase):
School, Location, OrgUnit, User, UserRole (role enum: HIEU_TRUONG, PHO_HIEU_TRUONG,
TO_TRUONG, GIAO_VIEN, NHAN_VIEN, ADMIN; có scopeLocationId và scopeOrgUnitId optional),
Plan (level enum: NAM, HOC_KY, QUY, THANG, TUAN; có parentPlanId tự tham chiếu,
progressPercent), Task (status enum: NHAP, DA_GIAO, DA_TIEP_NHAN, DANG_THUC_HIEN,
CHO_KIEM_TRA, BO_SUNG, HOAN_THANH, XAC_NHAN, DONG, TAM_DUNG, HUY; liên kết optional tới
Plan), TaskAssignment (role enum: CHU_TRI, PHOI_HOP, KIEM_TRA, PHE_DUYET, THEO_DOI),
TaskLog, Attachment, Notification (type enum), Comment.
Sau khi migrate, viết script backend/prisma/seed.ts sinh dữ liệu mẫu tiếng Việt thực tế:
- 1 trường "Trường THCS Phước Tân"
- 3 điểm trường: Điểm chính, Phân hiệu 1, Phân hiệu 2
- 8 tổ: 6 tổ chuyên môn (Toán-Tin, Văn-Sử-Địa, Anh văn, Khoa học tự nhiên, Thể-Nhạc-Họa,
  GDCD-HĐTN) + Tổ Văn phòng + Ban Giám hiệu
- 1 Hiệu trưởng, 3 Phó Hiệu trưởng (1 phụ trách chuyên môn chung, 2 phụ trách theo điểm
  trường), 6 tổ trưởng, ~40 giáo viên/nhân viên (đủ tên tiếng Việt có dấu thật, số điện
  thoại dạng 09xxxxxxxx, chức vụ/môn dạy khác nhau, phân bổ đều 3 điểm trường)
- 1 tài khoản vai trò ADMIN (Quản trị hệ thống, phạm vi toàn trường, không gắn 1 điểm
  trường/tổ cụ thể) — dùng để demo Prompt 4B/18B (Cấu hình hệ thống, Tài khoản, Phân quyền,
  sửa Điểm trường, Giáo viên theo điểm trường).
- 1 kế hoạch năm học 2026-2027 với 5-6 dòng kế hoạch mốc thời gian thực tế (dùng đúng nội
  dung mẫu: "Ổn định tổ chức sau sáp nhập", "Hoàn thiện và công khai Kế hoạch giáo dục",
  "Gửi kế hoạch về UBND/Phòng GD phê duyệt", "Rà soát học sinh cần hỗ trợ"...)
- 15-20 công việc ở NHIỀU trạng thái khác nhau (một số quá hạn, một số chờ kiểm tra, một
  số bị bổ sung, một số đã đóng) để Dashboard/Workflow có dữ liệu sinh động khi demo.
Chạy migrate + seed, xác nhận dữ liệu đã có trong DB.
```

### PROMPT 3 — Auth & phân quyền
```
Xây dựng module backend/src/modules/auth:
- POST /api/auth/login (email/phone + password) trả access token (15p) + refresh token
  (7 ngày) + thông tin user + danh sách UserRole (vai trò + phạm vi).
- POST /api/auth/refresh, POST /api/auth/logout.
- Middleware requireAuth gắn req.user; middleware requireRole(...roles) và
  requireScope() kiểm tra user chỉ được truy cập dữ liệu trong locationId/orgUnitId
  mình phụ trách (trừ HIEU_TRUONG và ADMIN thấy toàn trường).
- GET /api/auth/me trả hồ sơ + vai trò hiện hành.
Viết unit test đơn giản xác nhận: giáo viên gọi API dữ liệu của điểm trường khác nhận
lỗi 403.
```

### PROMPT 4 — API cơ cấu tổ chức, điểm trường, nhân sự (People Picker backend)
```
Xây dựng các API:
- CRUD Location, CRUD OrgUnit (kèm cây cha-con), GET /api/org/tree trả toàn bộ sơ đồ
  tổ chức dạng cây lồng nhau.
- GET /api/users?search=&orgUnitId=&locationId=&page=&pageSize= — API cốt lõi cho
  People Picker: tìm theo tên KHÔNG PHÂN BIỆT dấu tiếng Việt (chuẩn hoá bỏ dấu khi so
  khớp), trả kèm avatar, chức vụ, tổ, điểm trường, và currentTaskLoad (đếm số Task đang
  ở trạng thái chưa đóng mà user này là CHU_TRI hoặc PHOI_HOP), sắp xếp ưu tiên theo mức
  độ liên quan (khớp đầu tên trước).
- GET /api/users/:id/recent-collaborators — trả danh sách người hay được người dùng
  hiện tại giao việc cùng gần đây (dựa trên TaskAssignment 30 ngày gần nhất), dùng để
  gợi ý ưu tiên trong People Picker.
Đảm bảo API search chịu tải tốt với 200 user mẫu, có phân trang, thời gian phản hồi test
thủ công dưới 200ms.
```

### PROMPT 4B — API quản trị hệ thống: Tài khoản, Phân quyền, sửa Điểm trường (BỔ SUNG)
```
Bổ sung module backend/src/modules/admin, toàn bộ route bên dưới CHỈ cho phép vai trò ADMIN
và HIEU_TRUONG gọi (dùng middleware requireRole('ADMIN','HIEU_TRUONG')):

1) Quản lý tài khoản:
- GET /api/admin/users?search=&locationId=&orgUnitId=&role=&status=&page=&pageSize= — danh
  sách đầy đủ tài khoản (khác GET /api/users của People Picker ở chỗ trả thêm email, trạng
  thái active/khoá, danh sách UserRole đầy đủ, ngày tạo).
- POST /api/admin/users — tạo tài khoản mới (fullName, phone, email, position, locationId,
  orgUnitId, mảng roles ban đầu [{role, scopeLocationId, scopeOrgUnitId}]); mật khẩu mặc định
  "123456" (hash bcrypt), validate số điện thoại/email không trùng.
- PATCH /api/admin/users/:id — sửa thông tin cơ bản (fullName, phone, email, position,
  locationId, orgUnitId, avatarUrl).
- PATCH /api/admin/users/:id/status — khoá/mở khoá tài khoản (field isActive), tài khoản bị
  khoá không đăng nhập được (chặn ở bước login, trả lỗi rõ ràng bằng tiếng Việt).
- POST /api/admin/users/:id/reset-password — đặt lại mật khẩu về mặc định "123456".
- DELETE /api/admin/users/:id — chỉ cho xoá khi tài khoản CHƯA từng là CHU_TRI/PHOI_HOP của
  bất kỳ Task nào; nếu đã có dữ liệu liên quan thì trả lỗi gợi ý dùng chức năng khoá thay vì
  xoá.

2) Cấu hình phân quyền (gán vai trò + phạm vi cho từng tài khoản):
- POST /api/admin/users/:id/roles — thêm 1 dòng UserRole (role, scopeLocationId,
  scopeOrgUnitId) cho tài khoản, validate 1 người có thể có nhiều vai trò/phạm vi nhưng
  không được trùng lặp y hệt (cùng role + cùng scope).
- DELETE /api/admin/users/:id/roles/:userRoleId — gỡ 1 vai trò/phạm vi khỏi tài khoản (chặn
  nếu đây là vai trò cuối cùng của tài khoản — mỗi tài khoản phải còn ít nhất 1 vai trò).
- GET /api/admin/permissions-matrix — trả về bảng tĩnh (hard-code trong code, không cần bảng
  DB riêng) mô tả mỗi vai trò (HIEU_TRUONG, PHO_HIEU_TRUONG, TO_TRUONG, GIAO_VIEN, NHAN_VIEN,
  ADMIN) được phép làm gì trong phạm vi demo (tham chiếu đúng bảng "Vai trò" ở SRS mục 3),
  dùng để hiển thị bảng tham khảo trên UI — KHÔNG cần cơ chế cấu hình quyền động theo hành
  động (permission builder), giữ đơn giản cho bản demo.

3) Sửa Điểm trường (mở rộng API Location đã có ở Prompt 4):
- PATCH /api/locations/:id — sửa tên, mã, địa chỉ, managerId (chọn người phụ trách bằng
  userId có sẵn).
- DELETE /api/locations/:id — chỉ cho xoá khi điểm trường không còn User nào gắn locationId
  và không còn Task nào gắn locationId; ngược lại trả lỗi liệt kê rõ đang có bao nhiêu nhân
  sự/công việc đang gắn.
- GET /api/locations/:id/summary — trả số nhân sự, số công việc đang triển khai, số công
  việc quá hạn tại điểm trường đó (dùng cho thẻ tổng quan trên UI quản trị).

4) Ghi log quản trị: thêm model AdminAuditLog (actorUserId, action, targetType, targetId,
   detail, createdAt) và ghi log tự động ở mọi hành động tạo/sửa/khoá/xoá tài khoản, gán/gỡ
   vai trò, sửa/xoá điểm trường — phục vụ mục "Timeline" nếu cần xem lại sau này (bản demo
   chỉ cần lưu, chưa cần màn hình xem log riêng).
```

### PROMPT 5 — API kế hoạch nhiều cấp
```
Xây dựng module plans:
- CRUD Plan theo cấp (NAM/HOC_KY/QUY/THANG/TUAN), validate parentPlanId đúng thứ bậc.
- GET /api/plans/:id/tree — trả cây kế hoạch đầy đủ (kèm các Task con của mỗi node).
- POST /api/plans/:id/generate-tasks — tạo nhanh 1..n Task con từ 1 dòng kế hoạch,
  Task kế thừa timeRange & mô tả từ Plan.
- Cơ chế tự tính lại Plan.progressPercent = trung bình progressPercent của các Task/Plan
  con mỗi khi có Task con cập nhật tiến độ (chạy đồng bộ ngay sau khi Task được update,
  không cần queue phức tạp cho bản demo).
- POST /api/plans/:id/duplicate — sao chép một kế hoạch (dùng cho "sao chép kỳ trước").
```

### PROMPT 6 — API công việc, giao việc RACI, workflow trạng thái
```
Xây dựng module tasks:
- POST /api/tasks (tạo việc, có thể gắn planId hoặc để trống = việc đột xuất).
- POST /api/tasks/:id/assignments (gán người theo role RACI: CHU_TRI bắt buộc đúng 1
  người, các role khác có thể nhiều người).
- PATCH /api/tasks/:id/status — chuyển trạng thái theo đúng chuỗi
  NHAP→DA_GIAO→DA_TIEP_NHAN→DANG_THUC_HIEN→CHO_KIEM_TRA→(BO_SUNG hoặc tiếp tục)→
  HOAN_THANH→XAC_NHAN→DONG (+ TAM_DUNG/HUY áp dụng được ở mọi bước theo quyền), validate
  chỉ đúng vai trò được phép mới chuyển được từng bước (ví dụ chỉ CHU_TRI mới gửi
  CHO_KIEM_TRA, chỉ KIEM_TRA mới duyệt hoặc yêu cầu BO_SUNG).
- Khi chuyển sang CHO_KIEM_TRA, kiểm tra Task có yêu cầu minh chứng bắt buộc chưa đủ thì
  chặn (trả lỗi rõ ràng bằng tiếng Việt).
- PATCH /api/tasks/:id/progress (cập nhật % tiến độ + ghi TaskLog).
- GET /api/tasks?status=&assigneeId=&locationId=&overdue=true — dùng cho các danh sách
  lọc (Việc của tôi, danh sách theo trạng thái).
- GET /api/tasks/:id/full — trả đầy đủ thông tin 1 Task: assignments (kèm thông tin liên
  hệ mỗi người), logs, attachments, comments.
```

### PROMPT 7 — API minh chứng (upload) + thông báo + dashboard
```
1) Module attachments: POST /api/tasks/:id/attachments (multipart/form-data, multer,
   lưu vào backend/uploads/tasks/:taskId/, giới hạn 20MB/file, chấp nhận
   pdf/doc/docx/xls/xlsx/jpg/png), GET để list, DELETE để xoá (chỉ người tải lên hoặc
   quản lý mới xoá được).
2) Module notifications: hàm nội bộ createNotification() được gọi tự động khi: giao việc
   mới, đổi hạn/người phụ trách, việc bị BO_SUNG, có kết quả phê duyệt, còn 2 ngày tới
   hạn (viết 1 cron job đơn giản chạy mỗi giờ check due date), quá hạn. API
   GET /api/notifications, PATCH /api/notifications/:id/read.
3) Module dashboard: GET /api/dashboard/overview?locationId=&orgUnitId= trả: tổng số
   việc, số theo từng trạng thái, số quá hạn, danh sách "việc cần quan tâm" (quá hạn/
   sắp hạn trong 3 ngày/bị trả lại), và breakdown theo điểm trường + theo tổ.
```

---

## PHẦN B — FRONTEND

### PROMPT 8 — Khởi tạo shell Angular, design system, điều hướng responsive
```
Xây dựng khung ứng dụng Angular:
- Layout chính: trên desktop dùng sidebar trái (Dashboard, Việc của tôi, Kế hoạch, Công
  việc, Tổ chức, Thông báo, và mục "Cấu hình hệ thống" chỉ hiện khi vai trò hiện hành là
  ADMIN hoặc HIEU_TRUONG — xem Prompt 18B); trên mobile (<768px) chuyển thành bottom
  navigation bar 4 mục chính (Việc của tôi, Kế hoạch, Thông báo, Cá nhân) + nút "+" nổi
  (FAB) để tạo việc nhanh; mục "Cấu hình hệ thống" trên mobile nằm trong trang "Cá nhân",
  cũng chỉ hiện với ADMIN/HIEU_TRUONG.
- Bảng màu: dùng CSS variables cho trạng thái: --status-new: #2E5EAA (xanh dương),
  --status-doing: #1F3864 (xanh dương đậm), --status-waiting: #F0A500 (vàng cam),
  --status-revise: #D9622B (cam đậm), --status-done: #2E7D32 (xanh lá),
  --status-overdue: #C62828 (đỏ).
- Component dùng chung `StatusBadgeComponent` (input: status) render đúng màu + nhãn
  tiếng Việt tương ứng.
- Component `StatusTabsCounterComponent`: thanh tab ngang có đếm số theo trạng thái (mô
  phỏng phong cách: "Tất cả (16)", "Mới (3)", "Đang thực hiện (7)", "Chờ phê duyệt (0)",
  "Đóng (2)" — tab đang chọn có gạch chân xanh, các tab đều hiện badge số tròn).
- HTTP interceptor tự gắn JWT + tự refresh token khi hết hạn; AuthGuard chặn route theo
  vai trò.
Font chữ rõ ràng cỡ tối thiểu 14px trên mobile, khoảng cách chạm (tap target) tối thiểu
44px.
```

### PROMPT 9 — Màn hình đăng nhập & chọn ngữ cảnh làm việc
```
Xây dựng trang đăng nhập: 2 ô nhập (số điện thoại/email, mật khẩu), nút "Đăng nhập" lớn
màu chủ đạo, không có yếu tố thừa. Sau đăng nhập, nếu user có nhiều vai trò/phạm vi phụ
trách, hiện màn hình "Chọn vai trò làm việc" dạng danh sách card lớn dễ bấm (VD: "Phó
Hiệu trưởng – Phân hiệu 1", "Tổ trưởng Tổ Toán-Tin") trước khi vào Dashboard. Lưu lựa
chọn vào localStorage để lần sau tự động vào thẳng.
```

### PROMPT 10 — Component dùng chung: People Picker
```
Xây dựng `PeoplePickerComponent` (dùng chung toàn ứng dụng, hỗ trợ chọn 1 người
(single) hoặc nhiều người (multi) qua @Input mode):
- Desktop: dạng autocomplete/combobox — gõ là tìm ngay (debounce 250ms gọi API
  GET /api/users?search=), danh sách gợi ý hiện avatar + tên + chức vụ + điểm trường +
  chấm màu thể hiện tải công việc hiện tại (xanh = ít việc, vàng = vừa, đỏ = nhiều việc
  đang xử lý).
- Mobile: bấm vào field mở modal full-screen, ô tìm kiếm cố định trên cùng, danh sách
  cuộn dọc lớn dễ bấm ngón tay, có nút "Xong" ở góc trên phải.
- Khi mở lần đầu (chưa gõ gì), hiển thị sẵn danh sách "Gần đây/hay giao việc cùng" (dùng
  API recent-collaborators) để không phải gõ tìm với người hay giao việc.
- Có bộ lọc nhanh dạng chip: Theo tổ / Theo điểm trường / Theo chức vụ.
- Người đã chọn hiển thị dạng chip có avatar nhỏ, bấm x để bỏ chọn.
Viết 1 trang demo riêng /dev/people-picker để bạn tự kiểm tra component với dữ liệu 40+
giáo viên mẫu trước khi dùng ở các màn hình khác — đo thử thao tác chọn xong 1 người mất
bao nhiêu lần bấm/gõ.
```

### PROMPT 11 — Component dùng chung: Contact Mini-Card (click-to-call) & File Dropzone
```
1) `ContactMiniCardComponent`: nhận userId, hiển thị dạng popover (desktop) hoặc
   bottom-sheet (mobile) khi bấm vào tên/avatar bất kỳ đâu trong app — gồm avatar lớn,
   họ tên, chức vụ, tổ, điểm trường, và 1 nút "Gọi điện" to, rõ, dùng thẻ <a
   href="tel:...">, cộng 1 nút phụ "Zalo" (demo có thể chỉ mở link giả lập).
2) `FileDropzoneComponent`: vùng kéo-thả lớn có viền nét đứt, đổi màu khi rê file vào
   (dragover), text hướng dẫn "Kéo file vào đây hoặc bấm để chọn"; trên mobile hiện 2 nút
   lớn riêng biệt "📷 Chụp ảnh" và "🖼️ Chọn ảnh có sẵn". Sau khi chọn, hiện thumbnail/
   icon loại file + progress bar khi đang tải lên + nút xoá. Emit sự kiện khi tải xong để
   component cha gọi API POST /api/tasks/:id/attachments.
```

### PROMPT 12 — Dashboard điều hành & "Việc của tôi"
```
1) Trang Dashboard (cho Hiệu trưởng/PHT): các thẻ số lớn (Tổng việc, Quá hạn, Đang làm,
   Hoàn thành), biểu đồ thanh ngang so sánh tiến độ theo điểm trường và theo tổ (dùng
   ngrx hoặc chỉ HttpClient tuỳ đơn giản, chart có thể dùng Chart.js hoặc SVG tự vẽ đơn
   giản), danh sách "Việc cần quan tâm" cho phép bấm vào từng dòng để nhảy tới chi tiết
   việc (drill-down). Toàn bộ số liệu lọc được theo điểm trường qua dropdown trên cùng.
2) Trang "Việc của tôi" (mặc định sau đăng nhập cho GV/NV/Tổ trưởng): nhóm việc theo
   Hôm nay / Tuần này / Sắp hạn / Quá hạn / Chờ tôi xác nhận, mỗi việc hiện dạng thẻ gọn
   (tên việc, hạn, StatusBadge, nút "Cập nhật nhanh" mở thẳng khu vực nhập % tiến độ +
   FileDropzone mà không cần vào trang chi tiết đầy đủ).
```

### PROMPT 13 — Cây kế hoạch (Plan Tree) & màn hình nhập/số hóa kế hoạch
```
1) `PlanTreeComponent`: hiển thị cây kế hoạch Năm→Kỳ→Quý→Tháng→Tuần dạng thu gọn/mở
   rộng (accordion lồng nhau), mỗi node hiện: tên, khoảng thời gian, thanh % tiến độ màu
   theo mức độ đúng hạn, số lượng Task con. Bấm vào node mở rộng xem danh sách Task con
   ngay bên trong (không chuyển trang), bấm vào 1 Task chuyển sang trang chi tiết việc.
2) Màn hình "Tạo/Sửa kế hoạch": bố cục ĐÚNG như bảng giấy quen thuộc của giáo viên — 3
   cột nhập liệu cạnh nhau: "Thời gian", "Nội dung trọng tâm", "Kết quả cần đạt", có nút
   "+ Thêm dòng" để nhập nhiều mốc liên tiếp giống hệt cách viết kế hoạch giấy hiện tại.
   Sau khi lưu 1 dòng, hiện nút "Tạo công việc từ dòng này →" mở nhanh form giao việc
   (Prompt 14) với tên việc/mô tả/thời gian đã điền sẵn.
```

### PROMPT 14 — Form tạo & giao việc (wizard 3 bước)
```
Xây dựng form tạo/giao việc dạng wizard 3 bước rõ ràng (có thanh tiến trình 3 chấm trên
cùng):
Bước 1 "Thông tin việc": tên việc, mô tả, kết quả/sản phẩm cần nộp, hạn hoàn thành (date
picker to, dễ bấm), mức ưu tiên (3 nút lớn: Thường/Quan trọng/Khẩn), điểm trường thực
hiện, tuỳ chọn "yêu cầu minh chứng bắt buộc" (checkbox + chọn loại minh chứng).
Bước 2 "Chọn người phụ trách": dùng PeoplePickerComponent (Prompt 10) để chọn 1 người
Chủ trì (bắt buộc), thêm người Phối hợp (multi), người Kiểm tra, người Phê duyệt.
Bước 3 "Xác nhận": tóm tắt toàn bộ thông tin đọc dễ hiểu, nút "Giao việc" lớn màu chủ
đạo ở cuối.
Sau khi bấm Giao việc, gọi POST /api/tasks + POST assignments liên tiếp, hiện thông báo
thành công + hỏi "Giao việc khác?" hoặc "Xem chi tiết việc vừa tạo".
Bổ sung: cho phép bắt đầu wizard từ 1 mẫu công việc có sẵn (giao ban, kiểm tra CSVC...)
để điền sẵn Bước 1.
```

### PROMPT 15 — Trang chi tiết công việc (nhật ký, tiến độ, minh chứng, bình luận)
```
Xây dựng trang chi tiết 1 công việc:
- Đầu trang: tên việc, StatusBadge lớn, hạn hoàn thành (đổi màu đỏ nếu quá hạn), avatar
  người Chủ trì kèm tên (bấm vào mở ContactMiniCardComponent).
- Khu vực "Những người liên quan": danh sách avatar theo từng vai trò RACI, mỗi avatar
  bấm được để gọi điện ngay.
- Thanh trượt cập nhật % tiến độ (chỉ hiện cho người có quyền cập nhật) + ô ghi chú ngắn.
- FileDropzoneComponent để đính kèm minh chứng, danh sách file đã đính kèm dạng
  thumbnail/icon có thể bấm xem trước.
- Timeline/nhật ký: liệt kê theo thời gian mọi lần cập nhật tiến độ, đổi trạng thái, ai
  làm, khi nào — dạng dòng thời gian dọc có icon phân biệt loại sự kiện.
- Khu vực bình luận với @mention người liên quan (gõ @ hiện gợi ý tên từ danh sách người
  liên quan tới việc).
- Vùng nút hành động theo trạng thái hiện tại: chỉ hiện đúng nút mà vai trò người dùng
  hiện tại được phép bấm (ví dụ người Chủ trì đang DANG_THUC_HIEN thấy nút "Gửi hoàn
  thành", người Kiểm tra khi CHO_KIEM_TRA thấy 2 nút "Xác nhận đạt" / "Yêu cầu bổ sung").
```

### PROMPT 16 — Bảng/Kanban theo dõi phê duyệt trực quan
```
Xây dựng trang "Theo dõi & Phê duyệt" dùng StatusTabsCounterComponent (Prompt 8) với các
tab: Tất cả / Mới / Đang thực hiện / Chờ kiểm tra / Chờ phê duyệt / Bổ sung / Đã đóng —
mỗi tab hiện số đếm tương ứng, style tab đang chọn có gạch chân + badge số tròn màu
riêng theo trạng thái (tham khảo đúng phong cách ảnh giao diện mẫu đã cung cấp: thanh
tab ngang phía trên bảng danh sách, có ô tìm kiếm + nút lọc bên phải).
Bảng/danh sách bên dưới mỗi dòng hiện: tên việc, StatusBadge, avatar + tên người ĐANG
GIỮ VIỆC (người cần hành động tiếp theo tuỳ theo trạng thái hiện tại), số ngày đã ở
trạng thái này (để thấy rõ điểm nghẽn), hạn hoàn thành. Trên mobile, bảng chuyển thành
danh sách thẻ dọc thay vì bảng nhiều cột. Có nút lọc nhanh "Chỉ hiện việc đang chờ tôi
xử lý".
```

### PROMPT 17 — Trung tâm thông báo
```
Trang Thông báo: danh sách thông báo mới nhất trên cùng, chưa đọc có chấm xanh + nền hơi
đậm hơn, icon riêng theo loại (giao việc mới, sắp hạn, quá hạn, bị trả lại, kết quả
duyệt). Bấm vào 1 thông báo tự đánh dấu đã đọc và điều hướng thẳng tới Task/Plan liên
quan. Icon chuông trên header hiện số lượng chưa đọc, cập nhật mỗi 30 giây (polling đơn
giản gọi GET /api/notifications).
```

### PROMPT 18 — Trang cơ cấu tổ chức & điểm trường
```
Trang "Tổ chức": hiện sơ đồ cây (Hiệu trưởng → PHT → Tổ → Thành viên) dùng component cây
có thể thu gọn/mở rộng, có thể lọc theo điểm trường bằng dropdown trên cùng (mỗi điểm
trường gắn 1 màu nhãn riêng hiện xuyên suốt app). Bấm vào 1 điểm trường mở trang riêng
liệt kê: danh sách nhân sự (dùng lại danh sách kiểu People Picker nhưng hiển thị dạng
bảng/thẻ đầy đủ), và danh sách công việc đang triển khai tại điểm trường đó.
```

### PROMPT 18B — Màn hình "Cấu hình hệ thống": Tài khoản, Phân quyền, Điểm trường, Giáo viên theo điểm trường (BỔ SUNG)
```
Xây dựng phân hệ frontend/src/app/features/admin-settings, chỉ hiện mục điều hướng
"Cấu hình hệ thống" (sidebar desktop / mục trong "Cá nhân" trên mobile) khi vai trò hiện
hành là ADMIN hoặc HIEU_TRUONG (dùng AuthGuard + kiểm tra role, ẩn hẳn khỏi menu với vai trò
khác, không chỉ ẩn UI mà còn chặn route).

Trang gồm 4 tab ngang (dùng lại phong cách StatusTabsCounterComponent nhưng không cần đếm
số theo trạng thái, chỉ cần tab thường): "Tài khoản" · "Phân quyền" · "Điểm trường" ·
"Giáo viên theo điểm trường".

1) Tab "Tài khoản":
   - Ô tìm kiếm + bộ lọc chip (Theo điểm trường / Theo tổ / Theo vai trò / Đang hoạt động -
     Đã khoá), gọi GET /api/admin/users.
   - Desktop: bảng (Họ tên, SĐT, Điểm trường, Tổ, Vai trò hiện có dạng chip nhỏ, Trạng thái,
     3 nút hành động). Mobile: danh sách thẻ dọc, mỗi thẻ có menu "..." chứa các hành động.
   - Nút "+ Tạo tài khoản mới" nổi góc phải trên mở form: Họ tên, SĐT, Email, Chức vụ, chọn
     Điểm trường + Tổ (dropdown), chọn 1 hoặc nhiều Vai trò ban đầu — gọi POST
     /api/admin/users, sau khi tạo hiện thông báo kèm mật khẩu mặc định "123456" để gửi lại
     cho giáo viên.
   - Mỗi dòng có 3 hành động: "Sửa thông tin" (mở form sửa, gọi PATCH .../:id), "Khoá/Mở
     khoá" (hộp xác nhận rõ hậu quả — tài khoản bị khoá sẽ không đăng nhập được), "Đặt lại
     mật khẩu" (hộp xác nhận, gọi POST .../reset-password, hiện lại mật khẩu mặc định).

2) Tab "Phân quyền":
   - Nửa trên: chọn 1 tài khoản (dùng lại PeoplePickerComponent chế độ single) để xem/sửa
     vai trò của người đó — hiện danh sách vai trò+phạm vi hiện tại dạng chip lớn (VD: "Phó
     Hiệu trưởng — Phân hiệu 1"), mỗi chip có nút x để gỡ (gọi DELETE .../roles/:id, chặn
     nếu là vai trò cuối cùng và báo lỗi thân thiện). Nút "+ Thêm vai trò" mở modal: chọn
     Vai trò (dropdown 6 lựa chọn) + chọn Phạm vi (Điểm trường và/hoặc Tổ, có thể để trống
     nếu vai trò áp dụng toàn trường như HIEU_TRUONG/ADMIN) → gọi POST .../roles.
   - Nửa dưới: "Bảng quyền tham khảo" — bảng tĩnh đọc từ GET /api/admin/permissions-matrix,
     liệt kê mỗi vai trò và các nhóm quyền chính (chỉ để tham khảo, không có ô chỉnh sửa,
     ghi rõ ghi chú "Bản demo dùng phân quyền cố định theo vai trò, chưa hỗ trợ tuỳ biến
     từng quyền riêng lẻ").

3) Tab "Điểm trường":
   - Danh sách điểm trường dạng thẻ lớn: tên, mã, địa chỉ, avatar + tên người phụ trách,
     3 số liệu nhỏ (số nhân sự, số công việc đang triển khai, số công việc quá hạn — lấy từ
     GET /api/locations/:id/summary).
   - Nút "+ Thêm điểm trường" mở form: Tên, Mã, Địa chỉ, chọn Người phụ trách bằng
     PeoplePickerComponent → POST /api/locations (API đã có từ Prompt 4).
   - Mỗi thẻ có nút "Sửa" mở đúng form trên với dữ liệu điền sẵn → PATCH /api/locations/:id,
     và nút "Xoá" chỉ bật được khi summary trả về 0 nhân sự và 0 công việc, ngược lại nút mờ
     đi kèm tooltip giải thích lý do không xoá được.

4) Tab "Giáo viên theo điểm trường":
   - Dropdown chọn 1 điểm trường ở trên cùng (mặc định điểm trường đầu tiên).
   - Danh sách toàn bộ giáo viên/nhân viên đang gắn với điểm trường đó: desktop dạng bảng
     (Họ tên, Tổ, Chức vụ, SĐT có thể bấm gọi luôn, số việc đang xử lý), mobile dạng thẻ.
     Ô tìm kiếm nhanh theo tên lọc ngay trong danh sách đã tải.
   - Nút "+ Thêm giáo viên vào điểm trường": mở lựa chọn giữa "Tạo tài khoản mới" (mở lại
     form ở Tab 1 với locationId điền sẵn) hoặc "Chuyển từ điểm trường khác" (dùng People
     Picker chọn 1 tài khoản có sẵn, xác nhận rồi PATCH locationId của tài khoản đó).
   - Mỗi dòng có nút "Chuyển điểm trường" mở modal nhỏ chọn điểm trường đích + hộp xác nhận
     (cảnh báo nếu người này đang CHU_TRI công việc chưa đóng tại điểm trường hiện tại).

Toàn bộ 4 tab tuân thủ nguyên tắc UX chung của dự án: tiếng Việt đơn giản, tối đa 3-4 bước
mỗi thao tác, tap target ≥44px, có loading skeleton + empty state thân thiện, mọi hành động
phá huỷ dữ liệu (khoá, xoá, gỡ vai trò) đều có hộp xác nhận rõ ràng.
```

### PROMPT 19 — Responsive polish & PWA cơ bản
```
Rà soát toàn bộ màn hình đã dựng ở khung hình 375px (iPhone SE) và 768px (tablet):
- Đảm bảo không có phần tử bị tràn ngang, chữ không quá nhỏ.
- Chuyển mọi bảng nhiều cột trên mobile thành danh sách thẻ.
- Đảm bảo FAB "+" tạo việc nhanh luôn trong tầm tay ở mọi trang chính.
- Thêm manifest.json + service worker cơ bản (ng add @angular/pwa) để có thể "Thêm vào
  màn hình chính" trên điện thoại.
- Thêm skeleton loading cho các danh sách khi đang tải dữ liệu, và empty state có hình
  minh hoạ + câu hướng dẫn thân thiện (ví dụ "Chưa có việc nào ở đây, hãy tạo việc mới!")
  thay vì màn hình trắng khi danh sách rỗng.
```

### PROMPT 20 — Seed kịch bản demo trình diễn
```
Viết thêm 1 script backend/prisma/demo-scenario.ts (chạy riêng sau seed cơ bản) tạo đúng
1 chuỗi câu chuyện để trình diễn trước Ban Giám hiệu:
- 1 kế hoạch "Kiểm tra học kỳ I" với 3 dòng mốc thời gian.
- 1 công việc đã tạo từ dòng kế hoạch, giao cho 1 giáo viên ở Phân hiệu 2, có người phối
  hợp ở Phân hiệu 1 (để demo tính năng liên hệ nhanh giữa 2 điểm trường).
- Công việc này đang ở trạng thái CHO_KIEM_TRA (để demo ngay tính năng "biết việc đang
  tắc ở ai").
- 1 công việc khác đang QUÁ HẠN 3 ngày (để demo Dashboard cảnh báo).
- 1 công việc đã ĐÓNG hoàn chỉnh có đủ minh chứng (để demo xem lại lịch sử/minh chứng).
In ra console hướng dẫn từng bước kịch bản demo (đăng nhập bằng tài khoản nào, vào trang
nào, bấm gì) để người trình diễn theo đúng luồng 5 vấn đề đã nêu trong SRS mục 2.
```

### PROMPT 21 — Kiểm thử nhanh & sửa lỗi UX
```
Chạy thử toàn bộ luồng nghiệp vụ chính (SRS mục 9): Lập kế hoạch → Giao việc → Cập nhật
tiến độ + minh chứng → Kiểm tra → Phê duyệt → Đóng việc, trên cả giao diện desktop và
mô phỏng mobile (DevTools responsive mode 375px). Liệt kê và sửa mọi điểm: thao tác nào
mất quá 3 bước cho việc thường xuyên (giao việc, cập nhật tiến độ), chỗ nào chữ tiếng
Việt bị lỗi font/dấu, chỗ nào nút bấm quá nhỏ trên mobile, chỗ nào thiếu loading/empty
state.
```

### PROMPT 22 — Hoàn thiện tài liệu chạy demo
```
Viết file DEMO_GUIDE.md ở thư mục gốc: hướng dẫn cài đặt (yêu cầu Node.js, PostgreSQL),
lệnh chạy (migrate, seed, seed demo-scenario, npm run dev cho cả 2 project), danh sách
tài khoản demo kèm mật khẩu cho từng vai trò (Hiệu trưởng, PHT, Tổ trưởng, Giáo viên),
và kịch bản trình diễn 5 phút bám theo đúng 5 vấn đề của Ban Giám hiệu đã nêu trong SRS.
```
