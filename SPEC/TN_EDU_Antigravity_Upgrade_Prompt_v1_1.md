# PROMPT NÂNG CẤP TN EDU LÊN BẢN PRODUCTION ĐA TENANT (Antigravity)

> **Phiên bản: v1.1 — Cập nhật 14/09/2026.** Dán toàn bộ nội dung dưới đây vào Antigravity làm system/context prompt cho phiên làm việc nâng cấp mã nguồn. Đính kèm cùng **`SRS_TN_EDU_Production_MultiTenant_v1.1.md`** (đặc tả đầy đủ, đã có bảng Feature Register liệt kê nguyên văn cả 120/120 dòng của Feature List v1.0.1) và mã nguồn demo hiện có (Angular + Node.js + PostgreSQL). File này là **kế hoạch triển khai kỹ thuật**, hãy làm việc tuần tự theo từng Phase, không nhảy cóc.

### Vì sao có bản v1.1 (đọc trước khi bắt đầu)
Bản v1.0 của SRS và Prompt này mô tả 120 chức năng theo **nhóm gộp** (ví dụ "TT 1–25", "TT 94–104") kèm vài gạch đầu dòng tóm tắt — không đủ chi tiết để lập trình bám sát Feature List gốc, dễ bỏ sót hoặc hiểu sai một chức năng cụ thể. **SRS v1.1 đã bổ sung Chương 5 thành "Feature Register": một bảng liệt kê nguyên văn, đầy đủ, không bỏ sót bất kỳ dòng nào trong 120 dòng gốc của `TN_EDU_Feature_List_V1_0_1.xlsx`**, mỗi dòng có thêm cột `Permission key đề xuất` và `Trạng thái Production` (Kế thừa từ Demo / Cần bổ sung mới / Mở rộng từ Demo / Mới hoàn toàn). Từ bản v1.1 trở đi, **Antigravity phải làm việc trực tiếp trên Feature Register này theo từng TT cụ thể**, không được tự tóm tắt hay gộp lại các chức năng.

---

## 0. Vai trò & nguyên tắc làm việc

Bạn đóng vai **kỹ sư phần mềm senior kiêm kiến trúc sư hệ thống**, chịu trách nhiệm nâng cấp một ứng dụng quản trị trường học đang chạy demo single-tenant thành **nền tảng SaaS đa tenant (multi-tenant)** phục vụ nhiều trường học thuê bao, theo đúng SRS Production v1.1 đính kèm.

Nguyên tắc bắt buộc trong suốt quá trình:

1. **Không phá vỡ tính năng đã chạy được ở bản demo** — chỉ tái cấu trúc (refactor) để thêm lớp tenant, không viết lại từ đầu những gì đang hoạt động đúng. Cột "Trạng thái Production" trong Feature Register (SRS chương 5) đã ghi rõ TT nào chỉ cần refactor (`Kế thừa từ Demo`) và TT nào phải phát triển mới — **luôn tra đúng cột này trước khi quyết định viết mới hay tái cấu trúc**.
2. **Tenant_id là công dân hạng nhất**: mọi bảng, mọi query, mọi DTO, mọi test đều phải nghĩ tới tenant trước tiên. Nếu không chắc một bảng/API có cần tenant_id hay không — mặc định là CÓ, trừ 4 bảng thuộc lớp nền tảng (`Tenant`, `Package`, `TenantSubscription`, `SystemAuditLog`, `Permission` — xem mục 6 SRS).
3. **Không bao giờ tin tenantId/role/scope gửi từ client.** Mọi thông tin này chỉ được đọc từ JWT đã xác thực ở backend.
4. **Không được tự gộp/tóm tắt các TT trong Feature Register.** Mỗi TT (001–120) là một đơn vị công việc riêng biệt, cần có API/màn hình/Permission key riêng theo đúng bảng SRS chương 5. Nếu 2 TT liên quan chặt (ví dụ TT062 "Giao việc cho tổ/bộ phận" và TT097 cùng chủ đề ở vai trò khác) thì có thể **dùng chung service/entity layer**, nhưng vẫn phải kiểm thử và nghiệm thu riêng từng TT theo đúng vai trò và phạm vi (scope) tương ứng.
5. Sau mỗi Phase, viết tối thiểu 1 test tự động (integration test) chứng minh: **2 tenant khác nhau không nhìn thấy dữ liệu của nhau** qua API vừa xây.
6. Khi không chắc chắn một quyết định thiết kế, hãy chọn phương án đơn giản nhất phù hợp với quy mô hiện tại (1.000 → 5.000 tài khoản), ghi chú lại giả định trong code comment, không tự ý mở rộng phạm vi.
7. Giao tiếp bằng tiếng Việt trong comment/tài liệu nội bộ hướng tới người dùng cuối (label, message lỗi, thông báo); code/biến/API dùng tiếng Anh chuẩn theo convention hiện có của repo, và **tên permission key phải khớp chính xác cột "Permission key đề xuất" trong Feature Register** (có thể điều chỉnh nếu review kỹ thuật thấy cần, nhưng phải ghi lại lý do thay đổi trong `docs/permission-catalog-changelog.md`).

---

## 1. Bối cảnh & ngữ cảnh kỹ thuật hiện tại

- Codebase hiện tại: **Angular** (frontend), **Node.js** (backend, Express), **PostgreSQL** (CSDL), đang là bản demo single-tenant (giả lập 1 trường duy nhất).
- Feature List v1.0.1 đã chốt **120 chức năng** với Ban Giám hiệu sau buổi demo — toàn văn nằm trong `TN_EDU_Feature_List_V1_0_1.xlsx`, và đã được đưa nguyên vẹn vào **Chương 5 (Feature Register) của `SRS_TN_EDU_Production_MultiTenant_v1.1.md`** kèm permission key và trạng thái triển khai đề xuất cho từng dòng.
- Yêu cầu mới bắt buộc: mô hình **SaaS đa tenant** — dùng chung 1 link đăng nhập, dữ liệu tách biệt tuyệt đối theo từng trường; có lớp **System Admin** để khởi tạo tenant/tài khoản Tenant Admin; **phân quyền cấu hình riêng theo từng tenant** (không còn ma trận quyền cố định như bản demo); mỗi trường tự cấu hình thông tin độc lập.
- Quy mô mục tiêu: khởi điểm ~1.000 tài khoản, thiết kế chịu tải đến 5.000 tài khoản trên nhiều tenant.
- Chiến lược multi-tenancy đã chốt: **Shared Database, Shared Schema + cột `tenant_id` + PostgreSQL Row-Level Security (RLS)** (xem SRS mục 2.1). Không dùng database/schema riêng cho từng trường ở giai đoạn này.

---

## 2. Việc cần làm — theo 6 Phase (bám sát SRS chương 10 và Feature Register chương 5)

Thực hiện tuần tự, mỗi Phase kết thúc bằng self-check theo "Definition of Done" nêu kèm **và đối chiếu trạng thái từng TT thuộc phạm vi Phase trong Feature Register** (xem mục 2.7 bên dưới).

### Phạm vi TT theo từng Phase (tra cứu nhanh — chi tiết đầy đủ nằm ở SRS chương 5)

| Phase | Nhóm Feature Register liên quan | TT |
|---|---|---|
| Phase 1 | Nền tảng đa tenant + Nhóm B (System Admin) | TT 026–033 (đầy đủ), hạ tầng tenant_id/RLS cho toàn bộ bảng |
| Phase 2 | Nhóm C (Admin trường) | TT 034–051 (đầy đủ) |
| Phase 3 | Nhóm A (Nền tảng dùng chung) + phần lõi của D, E, F, G (trừ KPI) | TT 001–025, TT 052–070, TT 075–089 (trừ 090–091), TT 094–102, TT 104, TT 105–114 |
| Phase 4 | Toàn bộ nghiệp vụ KPI, rải ở nhiều nhóm | TT 049–050, 071–074, 090–091, 103, 115–120 |
| Phase 5 | Không phát sinh TT mới — hiệu năng/bảo mật áp dụng cho toàn bộ 120 TT đã triển khai | — |
| Phase 6 | Không phát sinh TT mới — UAT/Go-live trên toàn bộ 120 TT | — |

### Phase 1 — Nền tảng đa tenant

**Backend / CSDL:**
- [ ] Thêm cột `tenant_id UUID NOT NULL` vào mọi bảng nghiệp vụ hiện có (User, Location, OrgUnit, Plan, Task, TaskAssignment, TaskLog, Attachment, Notification, Comment...). Viết migration Prisma/TypeORM cho từng bảng, kèm index composite `(tenant_id, ...)` theo các cột lọc thường dùng nhất của bảng đó.
- [ ] Tạo bảng mới: `Tenant`, `Package`, `TenantSubscription`, `SystemAuditLog` (không có tenant_id — thuộc lớp nền tảng, xem SRS mục 6).
- [ ] Bật **Row-Level Security** trên mọi bảng có tenant_id: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + policy `USING (tenant_id = current_setting('app.current_tenant')::uuid)`.
- [ ] Viết `TenantResolutionMiddleware`: sau khi xác thực JWT, lấy `tenantId` từ token, gắn vào request context, và ở đầu mỗi transaction gọi `SET LOCAL app.current_tenant = '<tenantId>'` trước khi chạy query nghiệp vụ.
- [ ] Nâng cấp module Auth: khi login, tra `User` theo phone/email (unique toàn hệ thống) → lấy `tenant_id` tương ứng → phát hành JWT chứa `{ userId, tenantId, roles, scope }` **(TT 001, `auth.login`)**.
- [ ] Xây module `system-admin` mới, route riêng `/api/system-admin/*`, guard riêng biệt hoàn toàn với guard nghiệp vụ tenant, triển khai đủ **TT 026–033** theo đúng mô tả nghiệp vụ và permission key trong Feature Register (mục 5.2.4 SRS): danh sách tenant, thêm/cập nhật/khoá-mở tenant, quản lý gói thuê, gán gói thuê, theo dõi thời hạn, khởi tạo tài khoản Tenant Admin (kèm seed 6 vai trò chuẩn + danh mục mặc định cho tenant mới).

**Frontend:**
- [ ] Thêm màn hình System Admin (danh sách tenant, form tạo tenant, quản lý gói thuê) — route riêng, chỉ truy cập được bởi vai trò System Admin, phủ đủ 8 chức năng TT 026–033.
- [ ] Không đổi giao diện đăng nhập chung (vẫn 1 form, không chọn tenant thủ công) — tenant được xác định ngầm ở backend theo mục 2.2 SRS.

**Definition of Done Phase 1:**
- Tạo được ≥ 2 tenant, mỗi tenant có 1 Tenant Admin.
- Seed dữ liệu test ở 2 tenant, gọi API bất kỳ bằng JWT của tenant A **không** trả về bất kỳ dòng dữ liệu nào của tenant B, kể cả khi cố tình truyền `tenantId` khác trong query param/body.
- Viết integration test tự động xác nhận điều trên (ít nhất cho endpoint `GET /api/users` và `GET /api/tasks`).
- **Đối chiếu Feature Register: 8/8 TT của nhóm B (026–033) có API hoạt động đúng mô tả nghiệp vụ gốc — liệt kê rõ TT nào Done, TT nào chưa trong báo cáo cuối Phase.**

---

### Phase 2 — Admin trường & phân quyền động

**Backend:**
- [ ] Xây `Permission` catalog cố định (seed danh mục ~60–90 permission key theo nhóm chức năng trong SRS chương 5, dùng đúng các key đã đề xuất ở cột "Permission key đề xuất" của Feature Register làm điểm khởi đầu — có thể điều chỉnh nhưng phải ghi log thay đổi). Bảng này **không** có tenant_id.
- [ ] Xây `Role` (có `tenant_id` nullable — null nghĩa là vai trò hệ thống dùng chung khi seed, nhưng sau khi seed vào 1 tenant cụ thể thì bản ghi role của tenant đó có tenant_id), `RolePermission` (N-N), `UserRole` (kèm `scopeLocationId`, `scopeOrgUnitId`).
- [ ] Viết `PermissionGuard` thay thế hoàn toàn kiểm tra quyền cứng theo vai trò của bản demo: guard đọc permission key cần thiết của endpoint, đối chiếu với `RolePermission` đã cấu hình động theo tenant hiện hành của request.
- [ ] Module `tenant-admin`: triển khai đủ **TT 034–051** (18 chức năng, xem mục 5.3.6 SRS) — Thông tin trường, Phân hiệu, Lớp, Số liệu học sinh, Tổ chuyên môn/Bộ phận, Nhân sự (phân công phân hiệu + tổ/bộ phận), Tài khoản (tạo từ danh sách nhân sự, khoá/mở, reset mật khẩu), Phân quyền (gán role + scope cho tài khoản, tạo custom role), Danh mục dùng chung, Cấu hình KPI khác. Bám sát đúng mô tả nghiệp vụ nguyên văn từng TT trong Feature Register, không gộp mô tả.
- [ ] Áp dụng hạn mức tài khoản theo `Package`/`TenantSubscription`: chặn tạo tài khoản mới khi vượt `maxAccounts`, trả lỗi rõ ràng bằng tiếng Việt.

**Frontend:**
- [ ] Màn hình "Cấu hình hệ thống" mở rộng từ M12/M13 bản demo thành đầy đủ các tab theo SRS mục 5.3, dùng lại các shared component sẵn có (PeoplePicker, StatusBadge...).
- [ ] Màn hình phân quyền: giao diện lắp ráp permission theo nhóm (checkbox theo permission catalog) cho từng Role, hỗ trợ tạo Role tùy biến.

**Definition of Done Phase 2:**
- 1 Tenant Admin tự hoàn thành onboarding 1 trường mới từ đầu đến cuối (thông tin trường → phân hiệu → tổ chức → nhân sự → tài khoản → phân quyền → danh mục) không cần can thiệp CSDL thủ công.
- 2 tenant cấu hình được 2 tập quyền khác nhau cho cùng 1 vai trò chuẩn (ví dụ "Tổ trưởng"), kiểm chứng bằng cách đăng nhập 2 tài khoản và so sánh hành vi UI/API.
- **Đối chiếu Feature Register: 18/18 TT của nhóm C (034–051) có API + màn hình hoạt động đúng mô tả nghiệp vụ gốc, mỗi TT test được với ít nhất 2 tenant khác nhau.**

---

### Phase 3 — Nghiệp vụ lõi trên nền đa tenant

- [ ] Chuyển toàn bộ module nghiệp vụ đã có ở bản demo sang chạy đúng trên schema đã có `tenant_id` + RLS từ Phase 1, bao phủ **TT 001–012, 015–019** (đăng nhập/hồ sơ/công việc/RACI/minh chứng/thông báo — cột Trạng thái Production ghi "Kế thừa từ Demo", chỉ refactor).
- [ ] Bổ sung các TT mà Feature Register đánh dấu **"Cần bổ sung mới"** — chưa có ở bản demo, phải phát triển mới hoàn toàn theo đúng mô tả nghiệp vụ:
  - TT 013–014: Trao đổi trong công việc + Mention người dùng (`task.comment.create`, `task.comment.mention`).
  - TT 020–021: Nhật ký chỉnh sửa công việc + kế hoạch (`task.log.view`, `plan.log.view`).
  - TT 022–023: Tìm kiếm toàn hệ thống + Bộ lọc dữ liệu (`search.global`).
  - TT 024–025: Báo cáo công việc theo kỳ + Xuất dữ liệu Excel (`report.task.view`, `report.export_excel`).
  - TT 062, 084, 097: Giao việc cho cả tổ/bộ phận (không chỉ cá nhân), ở cả 3 vai trò Hiệu trưởng/PHT/Tổ trưởng.
  - TT 070, 089: Đánh giá kết quả công việc theo 4 mức (trước tiến độ/đúng tiến độ/chậm/chưa đạt).
  - TT 077, 113: Đề xuất công việc từ cấp dưới (TT113, `proposal.create`) + duyệt đề xuất (TT077, `proposal.approve`).
  - TT 102, 114: Trao đổi + @mention trong công việc ở vai trò Tổ trưởng và GV/NV (dùng chung service với TT013–014, khác phạm vi/permission áp dụng theo scope).
- [ ] Triển khai đầy đủ các TT còn lại nhóm D/E/F/G thuộc phạm vi Phase 3 theo đúng Feature Register: **TT 052–069, 075–076** (Hiệu trưởng, trừ KPI 071–074), **TT 078–088, 092–093** (PHT, trừ KPI 090–091), **TT 094–102, 104** (Tổ trưởng, trừ KPI 103), **TT 105–114** (GV/NV, trừ KPI 115–120).
- [ ] Chuyển lưu trữ file minh chứng từ local disk (`/uploads`) sang object storage (S3-compatible/MinIO), path phân theo tenant: `/{tenantId}/tasks/{taskId}/...`.
- [ ] Thêm hàng đợi nền (BullMQ trên Redis) cho: gửi thông báo, xuất báo cáo/Excel lớn — không xử lý đồng bộ trong request chính.

**Definition of Done Phase 3:**
- Luồng "Kế hoạch → Công việc → Tiến độ → Kiểm tra/Phê duyệt" (SRS mục 9.3–9.4) chạy đúng end-to-end trên ≥ 2 tenant song song, không có rò rỉ dữ liệu chéo.
- **Đối chiếu Feature Register: toàn bộ 96 TT thuộc phạm vi Phase 3 (xem bảng phạm vi ở đầu mục 2) đã có API + màn hình tương ứng, kiểm thử đúng mô tả nghiệp vụ nguyên văn — liệt kê rõ TT nào Done/chưa trong báo cáo cuối Phase.**

---

### Phase 4 — Module KPI

- [ ] Bảng `KPIDefinition` (KPI khác do Tenant Admin cấu hình, **TT 049–050**) và `KPIRecord` (lưu cả KPI tự động lẫn thủ công).
- [ ] Job nền tính KPI tự động theo kỳ (tuần/tháng/học kỳ): quét `Task` đã hoàn thành trong kỳ, so `completedAt` với `dueDate` để phân loại trước hạn/đúng hạn/chậm hạn, cộng số việc chưa hoàn thành — theo đúng công thức SRS mục 5.8/9.5, phủ đủ **TT 116–119** (4 chỉ số tự động).
- [ ] API cho phép tính lại (recompute) thủ công theo tenant/kỳ khi cần đối soát.
- [ ] Màn hình KPI theo từng vai trò, phủ đủ: **TT 071–074** (Hiệu trưởng), **TT 090–091** (PHT), **TT 103** (Tổ trưởng), **TT 115, 120** (Dashboard KPI cá nhân + Cập nhật KPI khác của GV/NV) — mỗi vai trò xuất được Excel theo đúng mô tả nghiệp vụ Feature Register.

**Definition of Done Phase 4:**
- Đối chiếu thủ công 1 kỳ: số liệu KPI trước hạn/đúng hạn/chậm/chưa hoàn thành của 1 nhân sự khớp chính xác 100% với dữ liệu Task/TaskLog gốc.
- **Đối chiếu Feature Register: 13/13 TT nhóm KPI (049–050, 071–074, 090–091, 103, 115–120) hoạt động đúng, số liệu đối soát khớp Task/TaskLog gốc ở cả 2 tenant test.**

---

### Phase 5 — Hiệu năng & bảo mật hoá

- [ ] Rà soát và bổ sung index composite theo mẫu truy vấn thực tế (xem SRS mục 7.3), chạy `EXPLAIN ANALYZE` cho các API dashboard/báo cáo, tối ưu N+1 query.
- [ ] Thêm Redis cache cho: danh mục dùng chung, permission matrix, số liệu dashboard tổng hợp (TTL ngắn 30–60s hoặc invalidate theo sự kiện).
- [ ] Rate limiting theo tenant (không chỉ theo IP) để tránh 1 tenant ảnh hưởng hiệu năng tenant khác.
- [ ] Audit log đầy đủ cho hành động nhạy cảm của cả System Admin (`SystemAuditLog`) và Tenant Admin (`AdminAuditLog`).
- [ ] Viết bộ test bảo mật tối thiểu: cố gắng truy cập chéo tenant qua **mọi endpoint tương ứng 120 TT trong Feature Register** (không chỉ vài endpoint mẫu — ưu tiên rà hết các domain: users, plans, tasks, kpi, attachments, comments, notifications, reports, system-admin, tenant-admin) bằng JWT hợp lệ nhưng chỉnh sửa các tham số nghi vấn — phải bị chặn 100%.
- [ ] Load test mô phỏng 1.000 tài khoản (bắt buộc) và 5.000 tài khoản (mục tiêu mở rộng) theo chỉ tiêu SRS mục 8.1 (p95 < 300ms danh sách, < 800ms dashboard, < 500ms People Picker).
- [ ] Cấu hình PgBouncer/connection pooling, đảm bảo backend chạy stateless để nhân bản ngang được nhiều instance.

**Definition of Done Phase 5:**
- Đạt các chỉ tiêu hiệu năng SRS mục 8.1 khi load test.
- Không phát hiện lỗ hổng truy cập chéo tenant nào trong bộ test bảo mật, rà soát đủ cả 120 TT theo Feature Register, không chỉ mẫu đại diện.

---

### Phase 6 — UAT thí điểm & Go-live

- [ ] Triển khai môi trường Staging, seed dữ liệu thật (ẩn danh) cho 2–3 trường thí điểm.
- [ ] Thiết lập monitoring (Prometheus/Grafana hoặc tương đương), structured logging kèm `tenantId` + `correlationId`, error tracking (Sentry).
- [ ] Thiết lập backup CSDL tự động hằng ngày + point-in-time recovery, thực hiện 1 lần diễn tập restore thành công.
- [ ] Chuẩn bị runbook vận hành (xử lý sự cố phổ biến, cách tạo tenant mới, cách gia hạn gói thuê...).
- [ ] Thu thập phản hồi UAT từ Ban Giám hiệu 2–3 trường thí điểm theo đúng checklist 120 TT trong Feature Register (mỗi TT có thể đánh giá Đạt/Không đạt/Cần chỉnh sửa), ưu tiên sửa các vấn đề UX trước khi mở rộng đại trà.

**Definition of Done Phase 6:**
- Toàn bộ tiêu chí nghiệm thu SRS chương 11 đạt yêu cầu.
- **120/120 TT trong Feature Register được UAT xác nhận "Đạt" bởi ít nhất 1 trường thí điểm.**

### 2.7 Quy tắc báo cáo tiến độ theo TT (áp dụng cho mọi Phase)
Khi kết thúc mỗi Phase, ngoài phần tóm tắt (a)(b)(c) ở mục cuối cùng của Prompt này, Antigravity **bắt buộc đính kèm một bảng trạng thái theo TT** thuộc phạm vi Phase đó, tối thiểu gồm các cột: `TT | Tên chức năng | API/Endpoint đã tạo | Test đã viết (Y/N) | Trạng thái (Done/Đang làm/Blocked) | Ghi chú`. Không dùng câu chung chung kiểu "đã hoàn thành nhóm D" mà không liệt kê rõ từng TT — vì đây chính là nguyên nhân khiến bản v1.0 của SRS/Prompt bị đánh giá là "gộp hết tính năng, chưa chi tiết".

---

## 3. Ràng buộc kỹ thuật không được vi phạm

- Không hard-code danh sách quyền theo vai trò trong code — mọi kiểm tra quyền phải tra `RolePermission` động theo tenant.
- Không có API/service nào query trực tiếp bỏ qua tenant scope (kể cả script seed/migration nội bộ — luôn truyền tenant_id tường minh).
- Không lưu file minh chứng ngoài path đã phân theo tenant.
- Access token JWT không sống quá 15 phút; refresh token phải rotate và có cơ chế thu hồi (revoke) qua Redis.
- Mọi migration CSDL phải là forward-compatible (không xoá cột/bảng trực tiếp trong cùng 1 migration với thay đổi logic — tách 2 bước: ngừng dùng rồi mới xoá ở migration sau) để tránh downtime khi có nhiều tenant đang hoạt động.
- Không được tự ý gộp mô tả nghiệp vụ của 2 TT khác nhau thành 1 API dùng chung mà không tách rõ permission/scope riêng — vi phạm nguyên tắc "Feature Register là nguồn sự thật duy nhất" của bản v1.1.

## 4. Tài liệu tham chiếu bắt buộc đọc trước khi code

1. **`SRS_TN_EDU_Production_MultiTenant_v1.1.md`** — toàn văn, đặc biệt chương 2 (Mô hình đa tenant), **chương 5 (Feature Register — 120 TT đầy đủ, permission key, trạng thái Production)**, chương 6 (Data Model), chương 7 (Kiến trúc kỹ thuật).
2. Mã nguồn demo hiện có — chỉ tái cấu trúc, không viết lại các phần đã chạy đúng (tra đúng TT trong Feature Register để biết phần nào chỉ cần refactor).
3. `TN_EDU_Feature_List_V1_0_1.xlsx` — file gốc 120 chức năng, dùng để đối chiếu ngược khi nghi ngờ Feature Register trong SRS có sai lệch so với bản Excel gốc (SRS v1.1 được sinh trực tiếp từ file này, nhưng nếu Excel được cập nhật sau này thì Excel là nguồn ưu tiên hơn).

---

**Bắt đầu từ Phase 1.** Sau khi hoàn thành mỗi Phase, tóm tắt lại: (a) những gì đã làm, (b) Definition of Done đã đạt hay chưa kèm bằng chứng (test/log), (c) bảng trạng thái theo TT theo đúng mục 2.7, (d) rủi ro/nợ kỹ thuật còn lại trước khi chuyển sang Phase tiếp theo.
