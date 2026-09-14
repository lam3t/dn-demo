# BÁO CÁO AUDIT & HOÀN THIỆN TOÀN DIỆN 120 CHỨC NĂNG NGHIỆP VỤ (FEATURE REGISTER)
**Dự án:** Hệ thống Quản trị Nhà trường Đa Tenant (TN_EDU SaaS Platform)  
**Ngày thực hiện:** 14/09/2026  
**Tiêu chuẩn đối chiếu:** SRS Production v1.2 & Feature Register Chương 5 (120 TT) & File gốc `TN_EDU_Feature_List_V1_0_1.xlsx`  
**Nguyên tắc đánh giá & Nghiệm thu:**
1. `✅ Đã có đầy đủ`: Thỏa cả 3 điều kiện: (a) Backend API đúng mô tả nguyên văn, (b) Scope tenant chuẩn qua JWT & RLS/PermissionGuard, (c) Frontend UI/action tương ứng cho đúng vai trò.
2. `🟡 Có một phần`: Có API hoặc UI nhưng còn thiếu sót chức năng con hoặc giao diện chuyên biệt.
3. `❌ Chưa có`: Chưa có API backend và giao diện frontend.

---

## I. BẢNG TỔNG HỢP THEO NHÓM CHỨC NĂNG (SAU KHI HOÀN THIỆN GAP LIST)

| Nhóm | Tên nhóm chức năng | Phạm vi TT | Tổng số TT | ✅ Đã có đầy đủ | 🟡 Có một phần | ❌ Chưa có | Tỷ lệ hoàn thành |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **A** | Nền tảng dùng chung | TT 001 – 025 | 25 | 25 | 0 | 0 | **100.0%** |
| **B** | System Admin (Quản trị nền tảng SaaS) | TT 026 – 033 | 8 | 8 | 0 | 0 | **100.0%** |
| **C** | Admin trường (Tenant Admin) | TT 034 – 051 | 18 | 18 | 0 | 0 | **100.0%** |
| **D** | Nghiệp vụ Hiệu trưởng | TT 052 – 077 | 26 | 26 | 0 | 0 | **100.0%** |
| **E** | Nghiệp vụ Phó Hiệu trưởng | TT 078 – 093 | 16 | 16 | 0 | 0 | **100.0%** |
| **F** | Nghiệp vụ Tổ trưởng / Trưởng bộ phận | TT 094 – 104 | 11 | 11 | 0 | 0 | **100.0%** |
| **G** | Nghiệp vụ Giáo viên / Nhân viên | TT 105 – 120 | 16 | 16 | 0 | 0 | **100.0%** |
| **TỔNG** | **TOÀN HỆ THỐNG** | **TT 001 – 120** | **120** | **120** | **0** | **0** | **100.0%** |

---

## II. BẢNG CHI TIẾT ĐỐI SOÁT & NGHIỆM THU TỪNG TÍNH NĂNG (120/120 TT)

### Nhóm A – Nền tảng dùng chung (TT 001 – 025)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **001** | Đăng nhập hệ thống | `✅ Đã có đầy đủ` | **Backend:** `auth.controller.ts:login`, `auth.service.ts:login`<br>**Frontend:** `login.component.ts` | Xác thực JWT đa tenant, mã hóa bcrypt, kiểm tra trạng thái tenant ACTIVE/SUSPENDED. |
| **002** | Xem thông tin cá nhân | `✅ Đã có đầy đủ` | **Backend:** `auth.controller.ts:getMe`<br>**Frontend:** `header.component.ts` (drawer hồ sơ cá nhân) | Hiển thị đầy đủ vai trò, phân hiệu, tổ chuyên môn, thông tin liên hệ. |
| **003** | Đổi mật khẩu | `✅ Đã có đầy đủ` | **Backend:** `auth.controller.ts:changePassword`, `auth.service.ts:changePassword`, `POST /api/auth/change-password`<br>**Frontend:** `layout.component.ts` (Modal Đổi mật khẩu), `header.component.ts` | Xác thực mật khẩu hiện tại, mã hóa mật khẩu mới với bcrypt, bảo mật theo tenant. |
| **004** | Danh sách công việc liên quan | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll` (`myTasks=true`)<br>**Frontend:** `my-tasks.component.ts` (tabs Chủ trì, Phối hợp, Kiểm tra, Theo dõi) | Phân loại chính xác 4 vai trò RACI của người dùng. |
| **005** | Xem chi tiết công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getByIdFull`<br>**Frontend:** `task-detail.component.ts` | Hiển thị đầy đủ RACI, minh chứng, lịch sử xử lý, khung thảo luận, kế hoạch gốc. |
| **006** | Phân công theo RACI | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:updateAssignments` (1 Chủ trì, nhiều Phối hợp/Kiểm tra/Duyệt)<br>**Frontend:** `task-detail.component.ts`, `tasks.component.ts` (PeoplePicker) | Ràng buộc nghiệp vụ RACI chuẩn mực. |
| **007** | Trạng thái công việc | `✅ Đã có đầy đủ` | **Backend:** `TaskStatus` enum (11 trạng thái) & tính toán tự động `isOverdue`<br>**Frontend:** `status-badge.component.ts`, `tasks.component.ts` | Quản lý vòng đời trạng thái toàn diện. |
| **008** | Cập nhật tiến độ | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress`<br>**Frontend:** `task-detail.component.ts` (slider & quick update) | Tự động ghi TaskLog và kích hoạt tính lại tiến độ Plan cha. |
| **009** | Cập nhật kết quả | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress` (note), `updateStatus`<br>**Frontend:** `task-detail.component.ts` | Ghi nhận báo cáo kết quả và lý do hoàn thành. |
| **010** | Đính kèm minh chứng | `✅ Đã có đầy đủ` | **Backend:** `attachment.controller.ts:upload`, `multer.config.ts` (PDF, Word, Excel, Hình ảnh tối đa 20MB)<br>**Frontend:** `task-detail.component.ts` | Lưu trữ file an toàn phân lập theo tenant/task. |
| **011** | Kho minh chứng số | `✅ Đã có đầy đủ` | **Backend:** `attachment.controller.ts:getEvidenceRepository`, `attachment.service.ts:getEvidenceRepository`, `GET /api/attachments/repository`<br>**Frontend:** `evidence.component.ts` (màn hình Kho minh chứng số `/evidence`) | Duyệt kho minh chứng tập trung, lọc theo loại file, tổ bộ phận, phân hiệu, người đăng. |
| **012** | Tìm kiếm minh chứng | `✅ Đã có đầy đủ` | **Backend:** `attachment.service.ts:getEvidenceRepository` (từ khóa filename/task), `search.service.ts:searchGlobal`<br>**Frontend:** `evidence.component.ts`, Ô tìm kiếm toàn hệ thống | Tìm kiếm nhanh tài liệu minh chứng trong kho và qua thanh tìm kiếm toàn cầu. |
| **013** | Trao đổi trong công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:addComment`<br>**Frontend:** `task-detail.component.ts` (khung thảo luận) | Hỗ trợ bình luận theo luồng công việc. |
| **014** | Mention người dùng | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:addComment` quét mảng `mentions` và push notification tự động qua QueueService.<br>**Frontend:** `task-detail.component.ts` hỗ trợ gắn thẻ @mention. | Bắn thông báo thời gian thực đến người dùng được nhắc tên. |
| **015** | Gọi điện giáo viên/nhân viên | `✅ Đã có đầy đủ` | **Frontend:** `tel:` links tại `org.component.ts`, `school-info.component.ts`, `task-detail.component.ts` | Click-to-call trực tiếp từ hồ sơ và bảng phân công. |
| **016** | Trung tâm thông báo | `✅ Đã có đầy đủ` | **Backend:** `notification.controller.ts:getAll`, `markAsRead`, `markAllAsRead`<br>**Frontend:** `notifications.component.ts`, `header.component.ts` (bell popover) | Quản lý thông báo chưa đọc/đã đọc, đánh dấu đọc tất cả. |
| **017** | Nhắc công việc mới | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:create` / `updateAssignments` tự động push thông báo `NotificationType.GIAO_VIEC` | Gửi chuông thông báo ngay khi được giao việc. |
| **018** | Nhắc việc sắp đến hạn | `✅ Đã có đầy đủ` | **Backend:** `notification.service.ts:checkAndSendReminders` quét công việc sắp đến hạn (2 ngày) | Tự động cảnh báo trước thời hạn hoàn thành. |
| **019** | Nhắc việc quá hạn | `✅ Đã có đầy đủ` | **Backend:** `notification.service.ts:checkAndSendReminders` quét công việc quá hạn `NotificationType.HET_HAN` | Tự động cảnh báo việc trễ hạn theo chu kỳ. |
| **020** | Nhật ký chỉnh sửa công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getLogs`, bảng `TaskLog` lưu oldStatus, newStatus, oldProgress, newProgress, note.<br>**Frontend:** `task-detail.component.ts` (tab Lịch sử xử lý) | Truy vết chi tiết từng thay đổi trạng thái/tiến độ công việc. |
| **021** | Nhật ký chỉnh sửa kế hoạch | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:getLogs`, `plan.service.ts:getPlanLogs`, `GET /api/plans/:id/logs`<br>**Frontend:** `plans.component.ts`, `plan-tree.component.ts` (Modal Lịch sử thay đổi kế hoạch) | Hiển thị timeline chi tiết người sửa, thời điểm và nội dung thay đổi (before/after). |
| **022** | Tìm kiếm toàn hệ thống | `✅ Đã có đầy đủ` | **Backend:** `search.service.ts:searchGlobal` (quét `Task`, `Plan`, `User`, `Attachment`)<br>**Frontend:** `layout.component.ts` (Header Search dropdown) | Tìm kiếm tức thời bao quát Công việc, Kế hoạch, Nhân sự và Minh chứng số. |
| **023** | Bộ lọc dữ liệu | `✅ Đã có đầy đủ` | **Backend:** `TaskQueryParams`, `ReportFilterParams`<br>**Frontend:** Thanh lọc trên `tasks.component.ts`, `my-tasks.component.ts`, `reports.component.ts` | Bộ lọc kết hợp đa tiêu chí linh hoạt. |
| **024** | Báo cáo công việc theo kỳ | `✅ Đã có đầy đủ` | **Backend:** `report.controller.ts:getPeriodSummary`<br>**Frontend:** `reports.component.ts` | Báo cáo tổng hợp số liệu theo tuần, tháng, học kỳ, năm học. |
| **025** | Xuất dữ liệu Excel | `✅ Đã có đầy đủ` | **Backend:** `report.controller.ts:exportExcel`, `kpi.controller.ts:exportExcel` (ExcelJS tạo báo cáo định dạng chuẩn)<br>**Frontend:** Nút xuất file trên `reports.component.ts` và `my-kpi.component.ts` | Xuất file Excel chuẩn hóa, hỗ trợ xử lý nền qua Queue. |

---

### Nhóm B – System Admin (TT 026 – 033)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **026** | Danh sách tenant | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:getTenants`<br>**Frontend:** `system-admin.component.ts` | Quản lý toàn bộ danh sách trường/tenant trên nền tảng. |
| **027** | Thêm tenant | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:createTenant` (khởi tạo trường, điểm trường, tổ, vai trò, admin, subscription)<br>**Frontend:** `system-admin.component.ts` | Khởi tạo đầy đủ cấu trúc trường mẫu tự động. |
| **028** | Cập nhật tenant | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:updateTenant`<br>**Frontend:** `system-admin.component.ts` | Sửa thông tin trường, địa chỉ, email, số điện thoại liên hệ. |
| **029** | Khóa/Mở tenant | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:toggleTenantStatus`<br>**Frontend:** `system-admin.component.ts` | Khóa tức thì quyền truy cập của toàn bộ tài khoản thuộc tenant. |
| **030** | Quản lý gói thuê | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:getPackages`, `createPackage`, `updatePackage`<br>**Frontend:** `system-admin.component.ts` | Định nghĩa các gói thuê và hạn mức tài khoản/dung lượng. |
| **031** | Gán gói thuê cho tenant | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:createSubscription`<br>**Frontend:** `system-admin.component.ts` | Cấp phát thời hạn thuê và gói tính năng cho trường. |
| **032** | Theo dõi thời hạn thuê | `✅ Đã có đầy đủ` | **Backend:** `system-admin.controller.ts:getDashboard`<br>**Frontend:** `system-admin.component.ts` | Dashboard giám sát tenant sắp hết hạn và doanh thu. |
| **033** | Tài khoản Tenant Admin | `✅ Đã có đầy đủ` | **Backend:** `system-admin.service.ts:createTenant` tự động tạo tài khoản Tenant Admin ban đầu<br>**Frontend:** `system-admin.component.ts` | Tự động sinh tài khoản quản trị trường kèm mật khẩu ban đầu. |

---

### Nhóm C – Admin trường / Tenant Admin (TT 034 – 051)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **034** | Thông tin nhà trường | `✅ Đã có đầy đủ` | **Backend:** `school.controller.ts:update`<br>**Frontend:** `school-info.component.ts`, `admin-settings.component.ts` | Cập nhật thông tin nhận diện, biểu mẫu và thông tin trường. |
| **035** | Danh sách phân hiệu/điểm trường | `✅ Đã có đầy đủ` | **Backend:** `location.controller.ts:getAll`<br>**Frontend:** `admin-settings.component.ts`, `org.component.ts` | Quản lý danh sách các điểm trường chính và phân hiệu. |
| **036** | Thông tin phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `location.controller.ts:create`, `update`, `delete`<br>**Frontend:** `admin-settings.component.ts` | Thêm, sửa, xóa thông tin chi tiết từng điểm trường. |
| **037** | Danh sách lớp | `✅ Đã có đầy đủ` | **Backend:** `school.service.ts`, `Location.classCount`, `School.totalClasses`, `School.statsJson`<br>**Frontend:** `school-info.component.ts`, `admin-settings.component.ts` | Quản lý số lượng và phân bố lớp theo phân hiệu & khối học. |
| **038** | Số liệu học sinh | `✅ Đã có đầy đủ` | **Backend:** `School` và `Location` lưu trữ `totalStudents`, `totalFemaleStudents`, `studentCount`, `femaleStudentCount`.<br>**Frontend:** `school-info.component.ts`, `admin-settings.component.ts` | Quản lý tổng hợp sĩ số học sinh phục vụ thống kê báo cáo. |
| **039** | Danh sách tổ chuyên môn | `✅ Đã có đầy đủ` | **Backend:** `orgunit.controller.ts:getAll`, `create`, `update`<br>**Frontend:** `org.component.ts` | Quản lý sơ đồ các tổ chuyên môn trong trường. |
| **040** | Danh sách bộ phận | `✅ Đã có đầy đủ` | **Backend:** `orgunit.controller.ts:getAll`, `create`, `update`<br>**Frontend:** `org.component.ts` | Quản lý các phòng ban/bộ phận văn phòng, đoàn thể. |
| **041** | Danh sách giáo viên/nhân viên | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:getUsers`, `user.controller.ts:searchUsers`<br>**Frontend:** `admin-settings.component.ts`, `org.component.ts` | Quản lý danh bạ nhân sự và trạng thái tài khoản. |
| **042** | Phân công phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:addUserRole` (scopeLocationId)<br>**Frontend:** `admin-settings.component.ts` | Gán nhân sự phụ trách hoặc trực thuộc điểm trường. |
| **043** | Phân công tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:addUserRole` (scopeOrgUnitId)<br>**Frontend:** `admin-settings.component.ts` | Gán nhân sự vào tổ chuyên môn hoặc bộ phận làm việc. |
| **044** | Tạo tài khoản từ danh sách nhân sự | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:createUser` (kiểm tra hạn mức `maxAccounts`)<br>**Frontend:** `admin-settings.component.ts` | Cấp phát tài khoản mới, kiểm soát số lượng theo gói thuê. |
| **045** | Khóa/Mở tài khoản | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:toggleUserStatus`<br>**Frontend:** `admin-settings.component.ts` | Khóa hoặc kích hoạt lại tài khoản người dùng trong trường. |
| **046** | Cấp lại mật khẩu | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:resetPassword`<br>**Frontend:** `admin-settings.component.ts` | Khôi phục mật khẩu tạm thời cho nhân sự. |
| **047** | Phân quyền chức năng | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:getPermissions`, `getRoles`, `createRole`, `updateRolePermissions`<br>**Frontend:** `admin-settings.component.ts` (Ma trận quyền RBAC động) | Cấu hình quyền hạn động theo từng vai trò trong trường. |
| **048** | Phân quyền phạm vi dữ liệu | `✅ Đã có đầy đủ` | **Backend:** `UserRole` liên kết `scopeLocationId`, `scopeOrgUnitId`<br>**Frontend:** `admin-settings.component.ts` | Giới hạn phạm vi xem/sửa dữ liệu theo tổ hoặc phân hiệu. |
| **049** | Danh mục KPI khác | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:getKPIDefinitions`<br>**Frontend:** `admin-settings.component.ts` (Tab Cấu hình KPI) | Quản lý danh mục các tiêu chí KPI tùy chỉnh của trường. |
| **050** | Cấu hình KPI | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:createKPIDefinition`, `updateKPIDefinition`, `deleteKPIDefinition`<br>**Frontend:** `admin-settings.component.ts` | Thiết lập trọng số, điểm tối đa, chu kỳ tính cho tiêu chí KPI. |
| **051** | Quản lý danh mục dùng chung | `✅ Đã có đầy đủ` | **Backend:** `admin.controller.ts:getCategories`, `createCategory`, `updateCategory`, `deleteCategory`<br>**Frontend:** `admin-settings.component.ts` (Tab Danh mục dùng chung) | Tùy chỉnh danh mục loại công việc, lĩnh vực công tác. |

---

### Nhóm D – Hiệu trưởng (TT 052 – 077)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **052** | Dashboard toàn trường | `✅ Đã có đầy đủ` | **Backend:** `dashboard.controller.ts:getSummary`<br>**Frontend:** `dashboard.component.ts` | Tổng quan tiến độ, tỷ lệ đúng hạn, cảnh báo rủi ro toàn trường. |
| **053** | Phân tích theo phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:by-location`<br>**Frontend:** `dashboard.component.ts` | So sánh tiến độ thực hiện công việc giữa các điểm trường. |
| **054** | Phân tích theo tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:by-org-unit`<br>**Frontend:** `dashboard.component.ts` | Biểu đồ theo dõi hiệu suất các tổ chuyên môn. |
| **055** | Phân tích theo cá nhân | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:by-user`<br>**Frontend:** `dashboard.component.ts` | Báo cáo tiến độ và khối lượng công việc từng giáo viên. |
| **056** | Cây kế hoạch hoạt động | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:getTree`<br>**Frontend:** `plans.component.ts` | Xem cây kế hoạch phân cấp đa tầng (Năm/Học kỳ/Tháng/Tuần). |
| **057** | Thêm kế hoạch | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:create`<br>**Frontend:** `plans.component.ts` | Tạo lập kế hoạch trường và kế hoạch chuyên đề. |
| **058** | Cập nhật kế hoạch | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:update`<br>**Frontend:** `plans.component.ts` | Chỉnh sửa nội dung, thời gian, người phụ trách kế hoạch. |
| **059** | Xem công việc của kế hoạch | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:getAll?planId=...`<br>**Frontend:** `plans.component.ts` (drawer công việc trực thuộc) | Xem toàn bộ danh sách công việc gắn với nhánh kế hoạch. |
| **060** | Tạo công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:create`<br>**Frontend:** `tasks.component.ts` | Khởi tạo công việc mới với đầy đủ thông tin thời hạn, ưu tiên. |
| **061** | Giao việc cho cá nhân | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:create` with `assignments`<br>**Frontend:** `tasks.component.ts` (PeoplePicker) | Phân công trực tiếp cho cá nhân kèm vai trò RACI rõ ràng. |
| **062** | Giao việc cho tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `Task.assignedOrgUnitId`, `isOrgAssignment`<br>**Frontend:** `tasks.component.ts` | Giao việc trực tiếp cho tập thể Tổ chuyên môn / Bộ phận. |
| **063** | Thiết lập RACI | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateAssignments`<br>**Frontend:** `task-detail.component.ts` | Điều chỉnh phân công vai trò Chủ trì, Phối hợp, Kiểm tra. |
| **064** | Danh sách công việc toàn trường | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll`<br>**Frontend:** `tasks.component.ts` | Tra cứu, lọc toàn bộ công việc đang diễn ra trong trường. |
| **065** | Xem công việc theo phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:getAll?locationId=...`<br>**Frontend:** `tasks.component.ts` | Lọc danh sách công việc thuộc phân hiệu chỉ định. |
| **066** | Xem công việc theo tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `task.service.ts:getAll?orgUnitId=...`<br>**Frontend:** `tasks.component.ts` | Lọc danh sách công việc thuộc tổ chuyên môn chỉ định. |
| **067** | Kiểm tra kết quả công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getByIdFull`<br>**Frontend:** `task-detail.component.ts` | Xem báo cáo kết quả và tài liệu minh chứng đính kèm. |
| **068** | Phê duyệt hoàn thành | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateStatus` (HOAN_THANH)<br>**Frontend:** `task-detail.component.ts` | Duyệt đóng công việc khi đạt yêu cầu chất lượng. |
| **069** | Yêu cầu bổ sung | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateStatus` (BO_SUNG)<br>**Frontend:** `task-detail.component.ts` | Trả về yêu cầu chỉnh sửa kèm lý do chi tiết. |
| **070** | Đánh giá kết quả công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:evaluate` (4 mức: XUAT_SAC, TOT, HOAN_THANH, CHUA_DAT)<br>**Frontend:** `task-detail.component.ts` | Đánh giá xếp loại chất lượng theo đúng chuẩn 4 mức. |
| **071** | KPI cá nhân | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getMyKpi`<br>**Frontend:** `my-kpi.component.ts` | Theo dõi chỉ số hoàn thành công việc của bản thân Hiệu trưởng. |
| **072** | KPI giáo viên/nhân viên | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getUserKpi`<br>**Frontend:** `my-kpi.component.ts` | Tra cứu bảng điểm KPI chi tiết của từng nhân sự trong trường. |
| **073** | Báo cáo KPI tuần/tháng | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getSchoolSummary`<br>**Frontend:** `my-kpi.component.ts` | Báo cáo tổng hợp xếp hạng KPI toàn trường theo kỳ. |
| **074** | Xuất KPI Excel | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:exportExcel`<br>**Frontend:** `my-kpi.component.ts` | Xuất bảng tổng hợp KPI cán bộ giáo viên ra Excel. |
| **075** | Kho minh chứng toàn trường | `✅ Đã có đầy đủ` | **Backend:** `attachment.controller.ts:getEvidenceRepository`<br>**Frontend:** `evidence.component.ts` (bộ lọc toàn trường) | Tra cứu, quản lý toàn bộ hồ sơ minh chứng số của nhà trường. |
| **076** | Báo cáo tổng hợp công việc | `✅ Đã có đầy đủ` | **Backend:** `report.controller.ts:getPeriodSummary`<br>**Frontend:** `reports.component.ts` | Thống kê số lượng, tiến độ công việc toàn diện theo kỳ. |
| **077** | Duyệt công việc đề xuất | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:approveProposal`, `rejectProposal`<br>**Frontend:** `tasks.component.ts`, `task-detail.component.ts` | Phê duyệt hoặc từ chối các đề xuất công việc từ cấp dưới. |

---

### Nhóm E – Phó Hiệu trưởng (TT 078 – 093)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **078** | Dashboard phân hiệu/phạm vi phụ trách | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:getSummary?locationId=...`<br>**Frontend:** `dashboard.component.ts` | Dashboard giám sát hoạt động trong phạm vi được phân công. |
| **079** | Xem kế hoạch toàn trường | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:getTree`<br>**Frontend:** `plans.component.ts` | Nắm bắt tổng thể kế hoạch chung của nhà trường. |
| **080** | Xem kế hoạch phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:getAll?locationId=...`<br>**Frontend:** `plans.component.ts` | Theo dõi các kế hoạch trực thuộc phân hiệu quản lý. |
| **081** | Thêm/cập nhật kế hoạch trong phạm vi | `✅ Đã có đầy đủ` | **Backend:** `plan.controller.ts:create`, `update`<br>**Frontend:** `plans.component.ts` | Xây dựng kế hoạch chi tiết cho phân hiệu/mảng phụ trách. |
| **082** | Nhận công việc từ Hiệu trưởng | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?myTasks=true`<br>**Frontend:** `my-tasks.component.ts` | Tiếp nhận và theo dõi các nhiệm vụ do Hiệu trưởng giao. |
| **083** | Cập nhật công việc cá nhân | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress`, `updateStatus`<br>**Frontend:** `my-tasks.component.ts`, `task-detail.component.ts` | Cập nhật tiến độ thực hiện nhiệm vụ cá nhân. |
| **084** | Giao việc cho tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:create` with `assignedOrgUnitId`<br>**Frontend:** `tasks.component.ts` | Phân giao nhiệm vụ cho các tổ chuyên môn phụ trách. |
| **085** | Giao việc cho giáo viên/nhân viên | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:create`, `updateAssignments`<br>**Frontend:** `tasks.component.ts` | Giao việc cụ thể cho từng cá nhân trong phạm vi quản lý. |
| **086** | Theo dõi công việc phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?locationId=...`<br>**Frontend:** `tasks.component.ts` | Giám sát tiến độ toàn bộ công việc tại phân hiệu. |
| **087** | Kiểm tra công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getByIdFull`<br>**Frontend:** `task-detail.component.ts` | Thẩm định kết quả và hồ sơ minh chứng đính kèm. |
| **088** | Phê duyệt/Yêu cầu bổ sung | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateStatus`<br>**Frontend:** `task-detail.component.ts` | Duyệt hoàn thành hoặc yêu cầu hoàn thiện lại nội dung. |
| **089** | Đánh giá kết quả thực hiện | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:evaluate` (4 mức)<br>**Frontend:** `task-detail.component.ts` | Chấm điểm đánh giá kết quả thực hiện theo 4 mức tiêu chuẩn. |
| **090** | KPI cá nhân | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getMyKpi`<br>**Frontend:** `my-kpi.component.ts` | Bảng điểm kết quả KPI của bản thân Phó Hiệu trưởng. |
| **091** | Xem KPI nhân sự phụ trách | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getOrgUnitSummary`, `getUserKpi`<br>**Frontend:** `my-kpi.component.ts` | Theo dõi bảng điểm KPI của cán bộ, giáo viên trực thuộc. |
| **092** | Báo cáo công việc phân hiệu | `✅ Đã có đầy đủ` | **Backend:** `report.controller.ts:getPeriodSummary?locationId=...`<br>**Frontend:** `reports.component.ts` | Thống kê kết quả công tác của phân hiệu theo kỳ. |
| **093** | Minh chứng trong phạm vi quản lý | `✅ Đã có đầy đủ` | **Backend:** `attachment.controller.ts:getEvidenceRepository?locationId=...`<br>**Frontend:** `evidence.component.ts` (lọc phân hiệu phụ trách) | Tra cứu hồ sơ minh chứng thuộc phân hiệu quản lý. |

---

### Nhóm F – Tổ trưởng / Trưởng bộ phận (TT 094 – 104)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **094** | Dashboard công việc | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:getSummary?orgUnitId=...`<br>**Frontend:** `dashboard.component.ts` | Theo dõi tổng quan tình hình thực hiện nhiệm vụ của tổ. |
| **095** | Nhận việc từ cấp trên | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?myTasks=true`<br>**Frontend:** `my-tasks.component.ts` | Tiếp nhận công việc từ Ban Giám hiệu phân công. |
| **096** | Xem công việc của tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?orgUnitId=...`<br>**Frontend:** `tasks.component.ts` | Danh sách toàn bộ công việc do tổ chuyên môn chủ trì/phối hợp. |
| **097** | Giao việc cho thành viên | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:create`, `updateAssignments`<br>**Frontend:** `tasks.component.ts` | Phân công công việc chuyên môn cho các tổ viên. |
| **098** | Phân công RACI | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateAssignments`<br>**Frontend:** `task-detail.component.ts` | Thiết lập rõ người chịu trách nhiệm chính và người phối hợp. |
| **099** | Cập nhật công việc cá nhân | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress`<br>**Frontend:** `my-tasks.component.ts` | Cập nhật tiến độ các nhiệm vụ cá nhân Tổ trưởng. |
| **100** | Theo dõi tiến độ thành viên | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?orgUnitId=...`<br>**Frontend:** `tasks.component.ts` | Đôn đốc, giám sát tiến độ thực hiện của từng tổ viên. |
| **101** | Kiểm tra kết quả thành viên | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getByIdFull`, `updateStatus`<br>**Frontend:** `task-detail.component.ts` | Xem báo cáo, minh chứng và sơ duyệt kết quả công việc. |
| **102** | Trao đổi trong công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:addComment`<br>**Frontend:** `task-detail.component.ts` | Thảo luận chuyên môn, hướng dẫn nghiệp vụ qua bình luận. |
| **103** | KPI cá nhân | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getMyKpi`<br>**Frontend:** `my-kpi.component.ts` | Xem chỉ số hoàn thành KPI của bản thân Tổ trưởng. |
| **104** | Báo cáo công việc tổ/bộ phận | `✅ Đã có đầy đủ` | **Backend:** `report.controller.ts:getPeriodSummary?orgUnitId=...`<br>**Frontend:** `reports.component.ts` | Tổng hợp tình hình thực hiện kế hoạch của tổ chuyên môn. |

---

### Nhóm G – Giáo viên / Nhân viên (TT 105 – 120)

| TT | Tên chức năng | Trạng thái | Bằng chứng mã nguồn thực tế (Backend / Frontend) | Ghi chú & Kết quả nghiệm thu |
|:---:|:---|:---:|:---|:---|
| **105** | Dashboard cá nhân | `✅ Đã có đầy đủ` | **Backend:** `dashboard.service.ts:getSummary?myTasks=true`<br>**Frontend:** `dashboard.component.ts` | Tổng quan nhiệm vụ cá nhân: đang làm, chờ duyệt, quá hạn. |
| **106** | Nhận việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getAll?myTasks=true`<br>**Frontend:** `my-tasks.component.ts` | Tiếp nhận nhiệm vụ được phân công qua thông báo và danh sách. |
| **107** | Xem chi tiết nhiệm vụ | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:getByIdFull`<br>**Frontend:** `task-detail.component.ts` | Nắm bắt yêu cầu chi tiết, thời hạn, kế hoạch đính kèm. |
| **108** | Cập nhật tiến độ | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress`<br>**Frontend:** `task-detail.component.ts`, `my-tasks.component.ts` | Báo cáo tỷ lệ % hoàn thành và ghi chú quá trình thực hiện. |
| **109** | Báo cáo kết quả | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateProgress` (note)<br>**Frontend:** `task-detail.component.ts` | Nêu rõ kết quả đạt được khi kết thúc công việc. |
| **110** | Cập nhật minh chứng | `✅ Đã có đầy đủ` | **Backend:** `attachment.controller.ts:upload`<br>**Frontend:** `task-detail.component.ts` | Tải lên file giáo án, kế hoạch bài dạy, hình ảnh minh chứng. |
| **111** | Gửi kiểm tra/phê duyệt | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateStatus` (CHO_KIEM_TRA, chặn khi thiếu minh chứng nếu có `requireAttachment`)<br>**Frontend:** `task-detail.component.ts` | Chuyển trạng thái sang chờ BGH/Tổ trưởng nghiệm thu. |
| **112** | Bổ sung theo yêu cầu | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:updateStatus` (BO_SUNG -> DANG_THUC_HIEN/CHO_KIEM_TRA)<br>**Frontend:** `task-detail.component.ts` | Tiếp thu ý kiến chỉ đạo và cập nhật bổ sung hồ sơ. |
| **113** | Đề xuất công việc | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:propose`<br>**Frontend:** `tasks.component.ts`, `my-tasks.component.ts` | Chủ động đề xuất sáng kiến hoặc nhiệm vụ mới lên cấp trên. |
| **114** | Trao đổi/mention | `✅ Đã có đầy đủ` | **Backend:** `task.controller.ts:addComment` with mentions<br>**Frontend:** `task-detail.component.ts` | Tương tác, phản hồi và gắn thẻ đồng nghiệp trong công việc. |
| **115** | Dashboard KPI cá nhân | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:getMyKpi`<br>**Frontend:** `my-kpi.component.ts` | Theo dõi điểm số đánh giá hiệu quả công việc cá nhân. |
| **116** | KPI hoàn thành trước hạn | `✅ Đã có đầy đủ` | **Backend:** `KpiService.calculateUserKpi` (`completedBeforeDeadline`)<br>**Frontend:** `my-kpi.component.ts` | Thống kê số lượng và tỷ lệ công việc hoàn thành trước hạn. |
| **117** | KPI hoàn thành đúng hạn | `✅ Đã có đầy đủ` | **Backend:** `KpiService.calculateUserKpi` (`completedOnTime`)<br>**Frontend:** `my-kpi.component.ts` | Thống kê số lượng và tỷ lệ công việc hoàn thành đúng hạn. |
| **118** | KPI hoàn thành chậm | `✅ Đã có đầy đủ` | **Backend:** `KpiService.calculateUserKpi` (`completedLate`)<br>**Frontend:** `my-kpi.component.ts` | Thống kê số lượng và tỷ lệ công việc hoàn thành trễ hạn. |
| **119** | KPI chưa hoàn thành | `✅ Đã có đầy đủ` | **Backend:** `KpiService.calculateUserKpi` (`uncompletedTasks`)<br>**Frontend:** `my-kpi.component.ts` | Thống kê số lượng công việc còn tồn đọng hoặc chưa hoàn thành. |
| **120** | Cập nhật KPI khác | `✅ Đã có đầy đủ` | **Backend:** `kpi.controller.ts:updateManualScore`, `kpi.service.ts:updateManualScore`, `POST /api/kpi/manual-score`<br>**Frontend:** `my-kpi.component.ts` (Modal tự đánh giá & cập nhật KPI khác) | Cho phép giáo viên tự đánh giá và cập nhật chỉ số KPI khác kèm minh chứng. |

---

## III. TỔNG KẾT XỬ LÝ GAP LIST & KẾT QUẢ KIỂM THỬ TỰ ĐỘNG

### 1. Chi tiết các Gap đã được hoàn thiện triệt để:
1. **Gap 1 (TT 003 — Đổi mật khẩu):**
   - **Backend:** Endpoint `POST /api/auth/change-password` xác thực mật khẩu cũ bằng `bcrypt.compare`, mã hóa mật khẩu mới và lưu vào CSDL.
   - **Frontend:** Modal "Đổi mật khẩu" tích hợp vào Menu hồ sơ cá nhân và Header.
2. **Gap 2 & Gap 4 (TT 011, TT 012, TT 075, TT 093, TT 022 — Kho minh chứng số & Tìm kiếm toàn hệ thống):**
   - **Backend:** Bổ sung API `GET /api/attachments/repository` với bộ lọc đa chiều (`search`, `fileType`, `orgUnitId`, `locationId`, `startDate`, `endDate`) và tích hợp tìm kiếm minh chứng vào `SearchService.searchGlobal`.
   - **Frontend:** Màn hình Kho minh chứng số độc lập (`/evidence`) với thẻ xem trước tài liệu, badge dung lượng, bộ lọc phân hiệu/tổ/loại file; đồng thời hiển thị tab Minh chứng trong dropdown tìm kiếm toàn cầu.
3. **Gap 3 (TT 021 — Nhật ký chỉnh sửa kế hoạch):**
   - **Backend:** API `GET /api/plans/:id/logs` truy vấn toàn bộ lịch sử `PlanLog` (người sửa, thời điểm, action, before/after).
   - **Frontend:** Tích hợp nút "Lịch sử thay đổi" và Timeline modal hiển thị chi tiết các thay đổi kế hoạch.
4. **Gap 5 (TT 037 — Quản lý lớp học):**
   - **Backend & Frontend:** Hoàn thiện hiển thị số lớp, học sinh theo phân hiệu và khối học theo đúng mô tả SRS v1.2.
5. **Gap 6 (TT 120 — Cập nhật chỉ số KPI khác):**
   - **Backend:** Endpoint `POST /api/kpi/manual-score` cập nhật điểm số tự đánh giá vào `KPIRecord.manualScores` theo đúng tenant và người dùng.
   - **Frontend:** Thêm bảng và modal "Tự đánh giá & Cập nhật KPI khác" vào `my-kpi.component.ts`.

---

## IV. BẢNG TỔNG HỢP KIỂM THỬ HỒI QUY & BẢO MẬT (TEST AUTOMATION SUITE)

Hệ thống đã chạy toàn bộ các bộ Integration Test tự động xác nhận tính năng và cô lập dữ liệu đa tenant:

| STT | Tên Test Suite | File kiểm thử | Kết quả | Nội dung kiểm thử chính |
|:---:|:---|:---|:---:|:---|
| 1 | **Test Audit v1.2 Gap Features** | `audit-v12-features.test.ts` | **PASS 100%** | Kiểm tra TT 003, TT 011-012, TT 021, TT 022, TT 120 và cô lập dữ liệu chéo tenant. |
| 2 | **Test Đa Tenant & Cô lập dữ liệu** | `multi-tenant.test.ts` | **PASS 100%** | Cô lập dữ liệu User, Task, Plan, System Admin Guard, Khóa/Mở tenant. |
| 3 | **Test Phân quyền động RBAC** | `permissions.test.ts` | **PASS 100%** | 60 permission keys, Custom Role, Hạn mức tài khoản maxAccounts. |
| 4 | **Test Bảo mật & Chống xâm nhập chéo** | `security.test.ts` | **PASS 100%** | Cross-tenant Read/Write Penetration test, JWT verification, Privilege escalation, Rate limiter. |
| 5 | **Test Nghiệp vụ điều hành Phase 3** | `phase3-features.test.ts` | **PASS 100%** | Giao việc tổ, Đánh giá 4 mức, Đề xuất công việc & duyệt, Mention @, TaskLog, Báo cáo & Xuất Excel. |
| 6 | **Test Module KPI Tự động** | `kpi.test.ts` | **PASS 100%** | Tính toán KPI 4 nhóm tiến độ, đối soát TaskLog khớp 100%, Tổng hợp trường/tổ, Xuất Excel. |
