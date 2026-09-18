-- ========================================================
-- TN EDU DATABASE BASELINE INITIALIZATION SCRIPT
-- 100% REAL PRODUCTION BASELINE (NO DEMO DATA)
-- ========================================================

-- 1. SEED SYSTEM PERMISSIONS (60 PERMISSIONS)
INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_view', 'plan.view', 'Xem kế hoạch', 'KE_HOACH', 'Xem danh sách và chi tiết kế hoạch theo phạm vi', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_view_all', 'plan.view_all', 'Xem toàn bộ kế hoạch trường', 'KE_HOACH', 'Xem tất cả kế hoạch mọi cấp trong toàn trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_create', 'plan.create', 'Tạo kế hoạch', 'KE_HOACH', 'Lập kế hoạch năm, học kỳ, quý, tháng, tuần', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_edit', 'plan.edit', 'Chỉnh sửa kế hoạch', 'KE_HOACH', 'Sửa nội dung, thời gian, cây kế hoạch trực thuộc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_delete', 'plan.delete', 'Xóa kế hoạch', 'KE_HOACH', 'Xóa kế hoạch chưa phát sinh công việc hoặc kế hoạch nháp', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_approve', 'plan.approve', 'Phê duyệt kế hoạch', 'KE_HOACH', 'Ban hành, phê duyệt kế hoạch trường/tổ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_export', 'plan.export', 'Xuất kế hoạch', 'KE_HOACH', 'Xuất file dữ liệu kế hoạch ra Excel/PDF', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_history', 'plan.history', 'Xem lịch sử kế hoạch', 'KE_HOACH', 'Xem nhật ký thay đổi và phiên bản kế hoạch', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_view', 'task.view', 'Xem công việc liên quan', 'CONG_VIEC', 'Xem công việc được giao hoặc có vai trò RACI', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_view_all', 'task.view_all', 'Xem toàn bộ công việc', 'CONG_VIEC', 'Xem mọi công việc trong phạm vi trường/tổ/phân hiệu', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_create', 'task.create', 'Tạo và giao việc', 'CONG_VIEC', 'Tạo công việc, giao cho cá nhân hoặc cả tổ/bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_edit', 'task.edit', 'Sửa thông tin công việc', 'CONG_VIEC', 'Chỉnh sửa tiêu đề, mô tả, hạn chót, độ ưu tiên', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_delete', 'task.delete', 'Xóa công việc', 'CONG_VIEC', 'Xóa công việc nháp hoặc đã tạo nhầm', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_assign', 'task.assign', 'Phân công vai trò RACI', 'CONG_VIEC', 'Chỉ định Người chủ trì, Phối hợp, Kiểm tra, Duyệt', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_update_progress', 'task.update_progress', 'Cập nhật tiến độ', 'CONG_VIEC', 'Cập nhật % tiến độ và nhật ký xử lý công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_upload_evidence', 'task.upload_evidence', 'Tải lên minh chứng', 'CONG_VIEC', 'Đính kèm tệp tin, hình ảnh minh chứng kết quả', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_request_review', 'task.request_review', 'Yêu cầu kiểm tra', 'CONG_VIEC', 'Gửi yêu cầu kiểm tra nghiệm thu khi hoàn tất', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_review', 'task.review', 'Kiểm tra công việc', 'CONG_VIEC', 'Xác nhận đạt yêu cầu hoặc trả lại chỉnh sửa', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_approve', 'task.approve', 'Phê duyệt hoàn thành', 'CONG_VIEC', 'Duyệt hoàn thành và xác nhận kết quả công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_request_revision', 'task.request_revision', 'Yêu cầu bổ sung', 'CONG_VIEC', 'Trả lại yêu cầu bổ sung minh chứng/sửa đổi', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_close', 'task.close', 'Đóng công việc', 'CONG_VIEC', 'Đóng và lưu trữ công việc đã hoàn thành', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_cancel', 'task.cancel', 'Hủy công việc', 'CONG_VIEC', 'Hủy bỏ công việc không còn thực hiện', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_propose', 'task.propose', 'Đề xuất công việc', 'CONG_VIEC', 'Đề xuất công việc mới từ cấp dưới lên lãnh đạo', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_approve_proposal', 'task.approve_proposal', 'Duyệt công việc đề xuất', 'CONG_VIEC', 'Xem xét và phê duyệt các đề xuất công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_comment', 'task.comment', 'Bình luận & @mention', 'CONG_VIEC', 'Trao đổi, thảo luận và gắn thẻ thành viên trong công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_history', 'task.history', 'Xem nhật ký công việc', 'CONG_VIEC', 'Xem toàn bộ lịch sử chỉnh sửa và thay đổi trạng thái', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_export', 'task.export', 'Xuất danh sách công việc', 'CONG_VIEC', 'Xuất danh sách công việc theo bộ lọc ra Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_personal', 'kpi.view_personal', 'Xem KPI cá nhân', 'KPI', 'Xem điểm số và thống kê hiệu suất bản thân', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_org', 'kpi.view_org', 'Xem KPI tổ/bộ phận', 'KPI', 'Xem bảng điểm và thống kê KPI của tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_location', 'kpi.view_location', 'Xem KPI phân hiệu', 'KPI', 'Xem thống kê hiệu suất theo từng phân hiệu/điểm trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_all', 'kpi.view_all', 'Xem KPI toàn trường', 'KPI', 'Xem bảng tổng hợp KPI của toàn thể cán bộ giáo viên', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_rate_4level', 'kpi.rate_4level', 'Đánh giá xếp loại 4 mức', 'KPI', 'Đánh giá kết quả thực hiện theo 4 mức (Xuất sắc/Tốt/Đạt/Chưa đạt)', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_recompute', 'kpi.recompute', 'Tính toán lại KPI', 'KPI', 'Chạy lại job tính toán và đối soát KPI tự động theo kỳ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_config', 'kpi.config', 'Cấu hình chỉ số KPI', 'KPI', 'Thiết lập các tiêu chí KPI bổ sung và trọng số đánh giá', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_export', 'kpi.export', 'Xuất báo cáo KPI', 'KPI', 'Xuất bảng điểm KPI và xếp loại ra Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_dashboard', 'report.view_dashboard', 'Xem Dashboard tổng quan', 'BAO_CAO', 'Xem biểu đồ thống kê tiến độ, hạn chót, tải công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_personal', 'report.view_personal', 'Xem báo cáo cá nhân', 'BAO_CAO', 'Xem tổng hợp tiến độ và kết quả công việc cá nhân', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_org', 'report.view_org', 'Xem báo cáo tổ bộ phận', 'BAO_CAO', 'Xem báo cáo tổng hợp cấp tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_school', 'report.view_school', 'Xem báo cáo toàn trường', 'BAO_CAO', 'Xem báo cáo tổng hợp toàn diện nhà trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_export_excel', 'report.export_excel', 'Xuất báo cáo Excel', 'BAO_CAO', 'Xuất các biểu mẫu báo cáo định kỳ ra file Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_advanced_search', 'report.advanced_search', 'Tìm kiếm nâng cao', 'BAO_CAO', 'Tra cứu nhanh toàn hệ thống theo nhiều tiêu chí lọc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_view', 'org.view', 'Xem cơ cấu tổ chức', 'DANH_MUC_TO_CHUC', 'Xem sơ đồ tổ chức, danh sách phân hiệu và tổ bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_school', 'org.manage_school', 'Quản lý thông tin trường', 'DANH_MUC_TO_CHUC', 'Cập nhật thông tin nhà trường, BGH và tổng số học sinh', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_locations', 'org.manage_locations', 'Quản lý phân hiệu/điểm trường', 'DANH_MUC_TO_CHUC', 'Thêm, sửa, xóa, chỉ định trưởng điểm trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_org_units', 'org.manage_org_units', 'Quản lý tổ chuyên môn', 'DANH_MUC_TO_CHUC', 'Thêm, sửa, xóa, sắp xếp tổ/bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_classes', 'org.manage_classes', 'Quản lý lớp & số liệu học sinh', 'DANH_MUC_TO_CHUC', 'Cập nhật quy mô lớp học và phân bố học sinh', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_staff', 'org.manage_staff', 'Phân công nhân sự', 'DANH_MUC_TO_CHUC', 'Phân công nhân sự vào phân hiệu và tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_categories', 'org.manage_categories', 'Quản lý danh mục dùng chung', 'DANH_MUC_TO_CHUC', 'Cấu hình năm học, học kỳ, chức danh, loại công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_view', 'account.view', 'Xem danh sách tài khoản', 'QUAN_TRI_HE_THONG', 'Xem danh sách nhân sự, trạng thái tài khoản và vai trò', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_create', 'account.create', 'Tạo tài khoản người dùng', 'QUAN_TRI_HE_THONG', 'Tạo tài khoản mới từ hồ sơ nhân sự theo hạn mức', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_update', 'account.update', 'Cập nhật tài khoản', 'QUAN_TRI_HE_THONG', 'Chỉnh sửa họ tên, email, số điện thoại, chức vụ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_lock', 'account.lock', 'Khóa / Mở khóa tài khoản', 'QUAN_TRI_HE_THONG', 'Tạm khóa hoặc kích hoạt lại quyền đăng nhập', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_reset_password', 'account.reset_password', 'Đặt lại mật khẩu', 'QUAN_TRI_HE_THONG', 'Reset mật khẩu tài khoản về mặc định hoặc mật khẩu mới', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_assign_role', 'account.assign_role', 'Gán vai trò & phạm vi', 'QUAN_TRI_HE_THONG', 'Gán vai trò và phạm vi (phân hiệu, tổ bộ phận) cho tài khoản', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_view', 'role.view', 'Xem danh mục vai trò & ma trận quyền', 'QUAN_TRI_HE_THONG', 'Xem ma trận phân quyền của các vai trò', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_create', 'role.create', 'Tạo vai trò tùy biến', 'QUAN_TRI_HE_THONG', 'Thêm vai trò mới và thiết lập tập quyền tương ứng', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_update', 'role.update', 'Cấu hình quyền cho vai trò', 'QUAN_TRI_HE_THONG', 'Chỉnh sửa thông tin vai trò và ma trận checkbox quyền', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_delete', 'role.delete', 'Xóa vai trò tùy biến', 'QUAN_TRI_HE_THONG', 'Xóa vai trò tùy biến chưa gán cho tài khoản nào', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_audit_view', 'audit.view', 'Xem nhật ký quản trị', 'QUAN_TRI_HE_THONG', 'Xem lịch sử các thao tác quản trị tài khoản, phân quyền', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_system_view_quota', 'system.view_quota', 'Xem hạn mức gói thuê bao', 'QUAN_TRI_HE_THONG', 'Xem số lượng tài khoản đã dùng / tối đa, dung lượng lưu trữ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

-- 2. SEED SAAS PACKAGES (STANDARD & ENTERPRISE)
INSERT INTO "Package" ("id", "code", "name", "maxAccounts", "storageQuotaGB", "enabledModules", "price", "description", "createdAt", "updatedAt")
VALUES ('pkg_standard_01', 'STD', 'Gói Cơ bản (Standard)', 100, 20, '["PLANS","TASKS","REPORTS","ORG"]', 15000000, 'Dành cho các trường quy mô vừa và nhỏ (dưới 100 cán bộ giáo viên).', NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Package" ("id", "code", "name", "maxAccounts", "storageQuotaGB", "enabledModules", "price", "description", "createdAt", "updatedAt")
VALUES ('pkg_enterprise_02', 'ENT', 'Gói Nâng cao (Enterprise)', 500, 100, '["PLANS","TASKS","KPI","REPORTS","ORG","ATTACHMENTS_S3"]', 35000000, 'Dành cho trường liên cấp, nhiều điểm trường hoặc trên 100 cán bộ giáo viên.', NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- 3. SEED SYSTEM ADMIN ACCOUNT (chunh@tringhiatech.vn / 0913016667 / 123456)
INSERT INTO "User" ("id", "email", "phone", "fullName", "passwordHash", "title", "isSystemAdmin", "isActive", "createdAt", "updatedAt")
VALUES ('usr_system_admin_01', 'chunh@tringhiatech.vn', '0913016667', 'Quản trị Nền tảng (System Admin)', '$2a$10$qmW4QwGyZZKT.a//OJ2juelJnt43Y0OChWCnJ.xVtXF.QpLebJXz2', 'Platform System Administrator', true, true, NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "isSystemAdmin" = true, "isActive" = true;

-- 4. ASSIGN SYSTEM_ADMIN ROLE
INSERT INTO "UserRole" ("id", "userId", "role", "createdAt", "updatedAt")
VALUES ('urole_sysadmin_01', 'usr_system_admin_01', 'SYSTEM_ADMIN', NOW(), NOW())
ON CONFLICT DO NOTHING;

