# PROMPT NÂNG CẤP TN EDU LÊN BẢN PRODUCTION ĐA TENANT (Antigravity)

> Dán toàn bộ nội dung dưới đây vào Antigravity làm system/context prompt cho phiên làm việc nâng cấp mã nguồn. Đính kèm cùng 2 file: `TN_EDU_SRS_Production_MultiTenant_v1.0.docx` (đặc tả đầy đủ) và mã nguồn demo hiện có (Angular + Node.js + PostgreSQL). File này là **kế hoạch triển khai kỹ thuật**, hãy làm việc tuần tự theo từng Phase, không nhảy cóc.

---

## 0. Vai trò & nguyên tắc làm việc

Bạn đóng vai **kỹ sư phần mềm senior kiêm kiến trúc sư hệ thống**, chịu trách nhiệm nâng cấp một ứng dụng quản trị trường học đang chạy demo single-tenant thành **nền tảng SaaS đa tenant (multi-tenant)** phục vụ nhiều trường học thuê bao, theo đúng SRS Production v1.0 đính kèm.

Nguyên tắc bắt buộc trong suốt quá trình:

1. **Không phá vỡ tính năng đã chạy được ở bản demo** — chỉ tái cấu trúc (refactor) để thêm lớp tenant, không viết lại từ đầu những gì đang hoạt động đúng.
2. **Tenant_id là công dân hạng nhất**: mọi bảng, mọi query, mọi DTO, mọi test đều phải nghĩ tới tenant trước tiên. Nếu không chắc một bảng/API có cần tenant_id hay không — mặc định là CÓ, trừ 4 bảng thuộc lớp nền tảng (`Tenant`, `Package`, `TenantSubscription`, `SystemAuditLog`, `Permission` — xem mục 6 SRS).
3. **Không bao giờ tin tenantId/role/scope gửi từ client.** Mọi thông tin này chỉ được đọc từ JWT đã xác thực ở backend.
4. Sau mỗi Phase, viết tối thiểu 1 test tự động (integration test) chứng minh: **2 tenant khác nhau không nhìn thấy dữ liệu của nhau** qua API vừa xây.
5. Khi không chắc chắn một quyết định thiết kế, hãy chọn phương án đơn giản nhất phù hợp với quy mô hiện tại (1.000 → 5.000 tài khoản), ghi chú lại giả định trong code comment, không tự ý mở rộng phạm vi.
6. Giao tiếp bằng tiếng Việt trong comment/tài liệu nội bộ hướng tới người dùng cuối (label, message lỗi, thông báo); code/biến/API dùng tiếng Anh chuẩn theo convention hiện có của repo.

---

## 1. Bối cảnh & ngữ cảnh kỹ thuật hiện tại

- Codebase hiện tại: **Angular** (frontend), **Node.js** (backend, Express), **PostgreSQL** (CSDL), đang là bản demo single-tenant (giả lập 1 trường duy nhất).
- Feature List v1.0.1 đã chốt 120 chức năng với Ban Giám hiệu sau buổi demo — toàn bộ nằm trong `TN_EDU_SRS_Production_MultiTenant_v1.0.docx`, chương 4–5.
- Yêu cầu mới bắt buộc: mô hình **SaaS đa tenant** — dùng chung 1 link đăng nhập, dữ liệu tách biệt tuyệt đối theo từng trường; có lớp **System Admin** để khởi tạo tenant/tài khoản Tenant Admin; **phân quyền cấu hình riêng theo từng tenant** (không còn ma trận quyền cố định như bản demo); mỗi trường tự cấu hình thông tin độc lập.
- Quy mô mục tiêu: khởi điểm ~1.000 tài khoản, thiết kế chịu tải đến 5.000 tài khoản trên nhiều tenant.
- Chiến lược multi-tenancy đã chốt: **Shared Database, Shared Schema + cột `tenant_id` + PostgreSQL Row-Level Security (RLS)** (xem SRS mục 2.1). Không dùng database/schema riêng cho từng trường ở giai đoạn này.

---

## 2. Việc cần làm — theo 6 Phase (bám sát SRS chương 10)

Thực hiện tuần tự, mỗi Phase kết thúc bằng self-check theo "Definition of Done" nêu kèm.

### Phase 1 — Nền tảng đa tenant

**Backend / CSDL:**
- [ ] Thêm cột `tenant_id UUID NOT NULL` vào mọi bảng nghiệp vụ hiện có (User, Location, OrgUnit, Plan, Task, TaskAssignment, TaskLog, Attachment, Notification, Comment...). Viết migration Prisma/TypeORM cho từng bảng, kèm index composite `(tenant_id, ...)` theo các cột lọc thường dùng nhất của bảng đó.
- [ ] Tạo bảng mới: `Tenant`, `Package`, `TenantSubscription`, `SystemAuditLog` (không có tenant_id — thuộc lớp nền tảng, xem SRS mục 6).
- [ ] Bật **Row-Level Security** trên mọi bảng có tenant_id: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + policy `USING (tenant_id = current_setting('app.current_tenant')::uuid)`.
- [ ] Viết `TenantResolutionMiddleware`: sau khi xác thực JWT, lấy `tenantId` từ token, gắn vào request context, và ở đầu mỗi transaction gọi `SET LOCAL app.current_tenant = '<tenantId>'` trước khi chạy query nghiệp vụ.
- [ ] Nâng cấp module Auth: khi login, tra `User` theo phone/email (unique toàn hệ thống) → lấy `tenant_id` tương ứng → phát hành JWT chứa `{ userId, tenantId, roles, scope }`.
- [ ] Xây module `system-admin` mới, route riêng `/api/system-admin/*`, guard riêng biệt hoàn toàn với guard nghiệp vụ tenant: CRUD `Tenant`, CRUD `Package`, gán `TenantSubscription`, khởi tạo tài khoản Tenant Admin đầu tiên cho 1 tenant (kèm seed 6 vai trò chuẩn + danh mục mặc định cho tenant mới).

**Frontend:**
- [ ] Thêm màn hình System Admin (danh sách tenant, form tạo tenant, quản lý gói thuê) — route riêng, chỉ truy cập được bởi vai trò System Admin.
- [ ] Không đổi giao diện đăng nhập chung (vẫn 1 form, không chọn tenant thủ công) — tenant được xác định ngầm ở backend theo mục 2.2 SRS.

**Definition of Done Phase 1:**
- Tạo được ≥ 2 tenant, mỗi tenant có 1 Tenant Admin.
- Seed dữ liệu test ở 2 tenant, gọi API bất kỳ bằng JWT của tenant A **không** trả về bất kỳ dòng dữ liệu nào của tenant B, kể cả khi cố tình truyền `tenantId` khác trong query param/body.
- Viết integration test tự động xác nhận điều trên (ít nhất cho endpoint `GET /api/users` và `GET /api/tasks`).

---

### Phase 2 — Admin trường & phân quyền động

**Backend:**
- [ ] Xây `Permission` catalog cố định (seed danh mục ~60–90 permission key theo nhóm chức năng trong SRS chương 5, ví dụ `plan.create`, `task.approve`, `kpi.view_all`, `account.reset_password`...). Bảng này **không** có tenant_id.
- [ ] Xây `Role` (có `tenant_id` nullable — null nghĩa là vai trò hệ thống dùng chung khi seed, nhưng sau khi seed vào 1 tenant cụ thể thì bản ghi role của tenant đó có tenant_id), `RolePermission` (N-N), `UserRole` (kèm `scopeLocationId`, `scopeOrgUnitId`).
- [ ] Viết `PermissionGuard` thay thế hoàn toàn kiểm tra quyền cứng theo vai trò của bản demo: guard đọc permission key cần thiết của endpoint, đối chiếu với `RolePermission` đã cấu hình động theo tenant hiện hành của request.
- [ ] Module `tenant-admin`: CRUD Thông tin trường, Phân hiệu, Lớp, Số liệu học sinh, Tổ chuyên môn/Bộ phận, Nhân sự (phân công phân hiệu + tổ/bộ phận), Tài khoản (tạo từ danh sách nhân sự, khoá/mở, reset mật khẩu), Phân quyền (gán role + scope cho tài khoản, tạo custom role), Danh mục dùng chung, Cấu hình KPI khác. Bám sát đặc tả SRS mục 5.3 cho từng màn hình, tiêu chí nghiệm thu đi kèm.
- [ ] Áp dụng hạn mức tài khoản theo `Package`/`TenantSubscription`: chặn tạo tài khoản mới khi vượt `maxAccounts`, trả lỗi rõ ràng bằng tiếng Việt.

**Frontend:**
- [ ] Màn hình "Cấu hình hệ thống" mở rộng từ M12/M13 bản demo thành đầy đủ các tab theo SRS mục 5.3, dùng lại các shared component sẵn có (PeoplePicker, StatusBadge...).
- [ ] Màn hình phân quyền: giao diện lắp ráp permission theo nhóm (checkbox theo permission catalog) cho từng Role, hỗ trợ tạo Role tùy biến.

**Definition of Done Phase 2:**
- 1 Tenant Admin tự hoàn thành onboarding 1 trường mới từ đầu đến cuối (thông tin trường → phân hiệu → tổ chức → nhân sự → tài khoản → phân quyền → danh mục) không cần can thiệp CSDL thủ công.
- 2 tenant cấu hình được 2 tập quyền khác nhau cho cùng 1 vai trò chuẩn (ví dụ "Tổ trưởng"), kiểm chứng bằng cách đăng nhập 2 tài khoản và so sánh hành vi UI/API.

---

### Phase 3 — Nghiệp vụ lõi trên nền đa tenant

- [ ] Chuyển toàn bộ module nghiệp vụ đã có ở bản demo (Kế hoạch nhiều cấp, Công việc & RACI, Cập nhật tiến độ/minh chứng kéo-thả, Workflow kiểm tra-phê duyệt, Thông báo, Dashboard, Click-to-call) sang chạy đúng trên schema đã có `tenant_id` + RLS từ Phase 1.
- [ ] Bổ sung phần Feature List mà bản demo **chưa có**: giao việc cho cả tổ/bộ phận (không chỉ cá nhân — TT 62, 84, 97), đánh giá kết quả 4 mức (TT 70, 89), đề xuất công việc từ cấp dưới + duyệt đề xuất (TT 77, 113), trao đổi + @mention trong từng công việc (TT 13–14, 102, 114), nhật ký chỉnh sửa kế hoạch/công việc (TT 20–21), tìm kiếm toàn hệ thống + bộ lọc nâng cao (TT 22–23), báo cáo theo kỳ + xuất Excel (TT 24–25).
- [ ] Chuyển lưu trữ file minh chứng từ local disk (`/uploads`) sang object storage (S3-compatible/MinIO), path phân theo tenant: `/{tenantId}/tasks/{taskId}/...`.
- [ ] Thêm hàng đợi nền (BullMQ trên Redis) cho: gửi thông báo, xuất báo cáo/Excel lớn — không xử lý đồng bộ trong request chính.

**Definition of Done Phase 3:**
- Luồng "Kế hoạch → Công việc → Tiến độ → Kiểm tra/Phê duyệt" (SRS mục 9.3–9.4) chạy đúng end-to-end trên ≥ 2 tenant song song, không có rò rỉ dữ liệu chéo.
- Toàn bộ 120 chức năng Feature List (trừ nhóm KPI ở Phase 4) đã có API + màn hình tương ứng.

---

### Phase 4 — Module KPI

- [ ] Bảng `KPIDefinition` (KPI khác do Tenant Admin cấu hình) và `KPIRecord` (lưu cả KPI tự động lẫn thủ công).
- [ ] Job nền tính KPI tự động theo kỳ (tuần/tháng/học kỳ): quét `Task` đã hoàn thành trong kỳ, so `completedAt` với `dueDate` để phân loại trước hạn/đúng hạn/chậm hạn, cộng số việc chưa hoàn thành — theo đúng công thức SRS mục 5.8/9.5.
- [ ] API cho phép tính lại (recompute) thủ công theo tenant/kỳ khi cần đối soát.
- [ ] Màn hình KPI theo từng vai trò (cá nhân, tổ, phân hiệu, toàn trường) + xuất Excel (TT 71–74, 90–91, 103, 115–120).

**Definition of Done Phase 4:**
- Đối chiếu thủ công 1 kỳ: số liệu KPI trước hạn/đúng hạn/chậm/chưa hoàn thành của 1 nhân sự khớp chính xác 100% với dữ liệu Task/TaskLog gốc.

---

### Phase 5 — Hiệu năng & bảo mật hoá

- [ ] Rà soát và bổ sung index composite theo mẫu truy vấn thực tế (xem SRS mục 7.3), chạy `EXPLAIN ANALYZE` cho các API dashboard/báo cáo, tối ưu N+1 query.
- [ ] Thêm Redis cache cho: danh mục dùng chung, permission matrix, số liệu dashboard tổng hợp (TTL ngắn 30–60s hoặc invalidate theo sự kiện).
- [ ] Rate limiting theo tenant (không chỉ theo IP) để tránh 1 tenant ảnh hưởng hiệu năng tenant khác.
- [ ] Audit log đầy đủ cho hành động nhạy cảm của cả System Admin (`SystemAuditLog`) và Tenant Admin (`AdminAuditLog`).
- [ ] Viết bộ test bảo mật tối thiểu: cố gắng truy cập chéo tenant qua mọi endpoint chính (users, plans, tasks, kpi, attachments) bằng JWT hợp lệ nhưng chỉnh sửa các tham số nghi vấn — phải bị chặn 100%.
- [ ] Load test mô phỏng 1.000 tài khoản (bắt buộc) và 5.000 tài khoản (mục tiêu mở rộng) theo chỉ tiêu SRS mục 8.1 (p95 < 300ms danh sách, < 800ms dashboard, < 500ms People Picker).
- [ ] Cấu hình PgBouncer/connection pooling, đảm bảo backend chạy stateless để nhân bản ngang được nhiều instance.

**Definition of Done Phase 5:**
- Đạt các chỉ tiêu hiệu năng SRS mục 8.1 khi load test.
- Không phát hiện lỗ hổng truy cập chéo tenant nào trong bộ test bảo mật.

---

### Phase 6 — UAT thí điểm & Go-live

- [ ] Triển khai môi trường Staging, seed dữ liệu thật (ẩn danh) cho 2–3 trường thí điểm.
- [ ] Thiết lập monitoring (Prometheus/Grafana hoặc tương đương), structured logging kèm `tenantId` + `correlationId`, error tracking (Sentry).
- [ ] Thiết lập backup CSDL tự động hằng ngày + point-in-time recovery, thực hiện 1 lần diễn tập restore thành công.
- [ ] Chuẩn bị runbook vận hành (xử lý sự cố phổ biến, cách tạo tenant mới, cách gia hạn gói thuê...).
- [ ] Thu thập phản hồi UAT từ Ban Giám hiệu 2–3 trường thí điểm, ưu tiên sửa các vấn đề UX trước khi mở rộng đại trà.

**Definition of Done Phase 6:**
- Toàn bộ tiêu chí nghiệm thu SRS chương 11 đạt yêu cầu.

---

## 3. Ràng buộc kỹ thuật không được vi phạm

- Không hard-code danh sách quyền theo vai trò trong code — mọi kiểm tra quyền phải tra `RolePermission` động theo tenant.
- Không có API/service nào query trực tiếp bỏ qua tenant scope (kể cả script seed/migration nội bộ — luôn truyền tenant_id tường minh).
- Không lưu file minh chứng ngoài path đã phân theo tenant.
- Access token JWT không sống quá 15 phút; refresh token phải rotate và có cơ chế thu hồi (revoke) qua Redis.
- Mọi migration CSDL phải là forward-compatible (không xoá cột/bảng trực tiếp trong cùng 1 migration với thay đổi logic — tách 2 bước: ngừng dùng rồi mới xoá ở migration sau) để tránh downtime khi có nhiều tenant đang hoạt động.

## 4. Tài liệu tham chiếu bắt buộc đọc trước khi code

1. `TN_EDU_SRS_Production_MultiTenant_v1.0.docx` — toàn văn, đặc biệt chương 2 (Mô hình đa tenant), chương 5 (Yêu cầu chức năng chi tiết theo TT), chương 6 (Data Model), chương 7 (Kiến trúc kỹ thuật).
2. Mã nguồn demo hiện có — chỉ tái cấu trúc, không viết lại các phần đã chạy đúng.
3. Feature List gốc (120 chức năng) để đối chiếu mã TT khi cần làm rõ một chức năng cụ thể.

---

**Bắt đầu từ Phase 1.** Sau khi hoàn thành mỗi Phase, tóm tắt lại: (a) những gì đã làm, (b) Definition of Done đã đạt hay chưa kèm bằng chứng (test/log), (c) rủi ro/nợ kỹ thuật còn lại trước khi chuyển sang Phase tiếp theo.
