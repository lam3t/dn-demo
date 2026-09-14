export interface PermissionDef {
  key: string;
  name: string;
  category: 'KE_HOACH' | 'CONG_VIEC' | 'KPI' | 'BAO_CAO' | 'DANH_MUC_TO_CHUC' | 'QUAN_TRI_HE_THONG';
  description?: string;
}

export const PERMISSION_CATEGORIES = [
  { key: 'KE_HOACH', name: 'Quản lý Kế hoạch' },
  { key: 'CONG_VIEC', name: 'Công việc & RACI' },
  { key: 'KPI', name: 'Đánh giá & Chỉ số KPI' },
  { key: 'BAO_CAO', name: 'Báo cáo & Thống kê' },
  { key: 'DANH_MUC_TO_CHUC', name: 'Cơ cấu Tổ chức & Danh mục' },
  { key: 'QUAN_TRI_HE_THONG', name: 'Quản trị Người dùng & Phân quyền' }
] as const;

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  // 1. KE_HOACH
  { key: 'plan.view', name: 'Xem kế hoạch', category: 'KE_HOACH', description: 'Xem danh sách và chi tiết kế hoạch theo phạm vi' },
  { key: 'plan.view_all', name: 'Xem toàn bộ kế hoạch trường', category: 'KE_HOACH', description: 'Xem tất cả kế hoạch mọi cấp trong toàn trường' },
  { key: 'plan.create', name: 'Tạo kế hoạch', category: 'KE_HOACH', description: 'Lập kế hoạch năm, học kỳ, quý, tháng, tuần' },
  { key: 'plan.edit', name: 'Chỉnh sửa kế hoạch', category: 'KE_HOACH', description: 'Sửa nội dung, thời gian, cây kế hoạch trực thuộc' },
  { key: 'plan.delete', name: 'Xóa kế hoạch', category: 'KE_HOACH', description: 'Xóa kế hoạch chưa phát sinh công việc hoặc kế hoạch nháp' },
  { key: 'plan.approve', name: 'Phê duyệt kế hoạch', category: 'KE_HOACH', description: 'Ban hành, phê duyệt kế hoạch trường/tổ' },
  { key: 'plan.export', name: 'Xuất kế hoạch', category: 'KE_HOACH', description: 'Xuất file dữ liệu kế hoạch ra Excel/PDF' },
  { key: 'plan.history', name: 'Xem lịch sử kế hoạch', category: 'KE_HOACH', description: 'Xem nhật ký thay đổi và phiên bản kế hoạch' },

  // 2. CONG_VIEC
  { key: 'task.view', name: 'Xem công việc liên quan', category: 'CONG_VIEC', description: 'Xem công việc được giao hoặc có vai trò RACI' },
  { key: 'task.view_all', name: 'Xem toàn bộ công việc', category: 'CONG_VIEC', description: 'Xem mọi công việc trong phạm vi trường/tổ/phân hiệu' },
  { key: 'task.create', name: 'Tạo và giao việc', category: 'CONG_VIEC', description: 'Tạo công việc, giao cho cá nhân hoặc cả tổ/bộ phận' },
  { key: 'task.edit', name: 'Sửa thông tin công việc', category: 'CONG_VIEC', description: 'Chỉnh sửa tiêu đề, mô tả, hạn chót, độ ưu tiên' },
  { key: 'task.delete', name: 'Xóa công việc', category: 'CONG_VIEC', description: 'Xóa công việc nháp hoặc đã tạo nhầm' },
  { key: 'task.assign', name: 'Phân công vai trò RACI', category: 'CONG_VIEC', description: 'Chỉ định Người chủ trì, Phối hợp, Kiểm tra, Duyệt' },
  { key: 'task.update_progress', name: 'Cập nhật tiến độ', category: 'CONG_VIEC', description: 'Cập nhật % tiến độ và nhật ký xử lý công việc' },
  { key: 'task.upload_evidence', name: 'Tải lên minh chứng', category: 'CONG_VIEC', description: 'Đính kèm tệp tin, hình ảnh minh chứng kết quả' },
  { key: 'task.request_review', name: 'Yêu cầu kiểm tra', category: 'CONG_VIEC', description: 'Gửi yêu cầu kiểm tra nghiệm thu khi hoàn tất' },
  { key: 'task.review', name: 'Kiểm tra công việc', category: 'CONG_VIEC', description: 'Xác nhận đạt yêu cầu hoặc trả lại chỉnh sửa' },
  { key: 'task.approve', name: 'Phê duyệt hoàn thành', category: 'CONG_VIEC', description: 'Duyệt hoàn thành và xác nhận kết quả công việc' },
  { key: 'task.request_revision', name: 'Yêu cầu bổ sung', category: 'CONG_VIEC', description: 'Trả lại yêu cầu bổ sung minh chứng/sửa đổi' },
  { key: 'task.close', name: 'Đóng công việc', category: 'CONG_VIEC', description: 'Đóng và lưu trữ công việc đã hoàn thành' },
  { key: 'task.cancel', name: 'Hủy công việc', category: 'CONG_VIEC', description: 'Hủy bỏ công việc không còn thực hiện' },
  { key: 'task.propose', name: 'Đề xuất công việc', category: 'CONG_VIEC', description: 'Đề xuất công việc mới từ cấp dưới lên lãnh đạo' },
  { key: 'task.approve_proposal', name: 'Duyệt công việc đề xuất', category: 'CONG_VIEC', description: 'Xem xét và phê duyệt các đề xuất công việc' },
  { key: 'task.comment', name: 'Bình luận & @mention', category: 'CONG_VIEC', description: 'Trao đổi, thảo luận và gắn thẻ thành viên trong công việc' },
  { key: 'task.history', name: 'Xem nhật ký công việc', category: 'CONG_VIEC', description: 'Xem toàn bộ lịch sử chỉnh sửa và thay đổi trạng thái' },
  { key: 'task.export', name: 'Xuất danh sách công việc', category: 'CONG_VIEC', description: 'Xuất danh sách công việc theo bộ lọc ra Excel' },

  // 3. KPI
  { key: 'kpi.view_personal', name: 'Xem KPI cá nhân', category: 'KPI', description: 'Xem điểm số và thống kê hiệu suất bản thân' },
  { key: 'kpi.view_org', name: 'Xem KPI tổ/bộ phận', category: 'KPI', description: 'Xem bảng điểm và thống kê KPI của tổ chuyên môn' },
  { key: 'kpi.view_location', name: 'Xem KPI phân hiệu', category: 'KPI', description: 'Xem thống kê hiệu suất theo từng phân hiệu/điểm trường' },
  { key: 'kpi.view_all', name: 'Xem KPI toàn trường', category: 'KPI', description: 'Xem bảng tổng hợp KPI của toàn thể cán bộ giáo viên' },
  { key: 'kpi.rate_4level', name: 'Đánh giá xếp loại 4 mức', category: 'KPI', description: 'Đánh giá kết quả thực hiện theo 4 mức (Xuất sắc/Tốt/Đạt/Chưa đạt)' },
  { key: 'kpi.recompute', name: 'Tính toán lại KPI', category: 'KPI', description: 'Chạy lại job tính toán và đối soát KPI tự động theo kỳ' },
  { key: 'kpi.config', name: 'Cấu hình chỉ số KPI', category: 'KPI', description: 'Thiết lập các tiêu chí KPI bổ sung và trọng số đánh giá' },
  { key: 'kpi.export', name: 'Xuất báo cáo KPI', category: 'KPI', description: 'Xuất bảng điểm KPI và xếp loại ra Excel' },

  // 4. BAO_CAO
  { key: 'report.view_dashboard', name: 'Xem Dashboard tổng quan', category: 'BAO_CAO', description: 'Xem biểu đồ thống kê tiến độ, hạn chót, tải công việc' },
  { key: 'report.view_personal', name: 'Xem báo cáo cá nhân', category: 'BAO_CAO', description: 'Xem tổng hợp tiến độ và kết quả công việc cá nhân' },
  { key: 'report.view_org', name: 'Xem báo cáo tổ bộ phận', category: 'BAO_CAO', description: 'Xem báo cáo tổng hợp cấp tổ chuyên môn' },
  { key: 'report.view_school', name: 'Xem báo cáo toàn trường', category: 'BAO_CAO', description: 'Xem báo cáo tổng hợp toàn diện nhà trường' },
  { key: 'report.export_excel', name: 'Xuất báo cáo Excel', category: 'BAO_CAO', description: 'Xuất các biểu mẫu báo cáo định kỳ ra file Excel' },
  { key: 'report.advanced_search', name: 'Tìm kiếm nâng cao', category: 'BAO_CAO', description: 'Tra cứu nhanh toàn hệ thống theo nhiều tiêu chí lọc' },

  // 5. DANH_MUC_TO_CHUC
  { key: 'org.view', name: 'Xem cơ cấu tổ chức', category: 'DANH_MUC_TO_CHUC', description: 'Xem sơ đồ tổ chức, danh sách phân hiệu và tổ bộ phận' },
  { key: 'org.manage_school', name: 'Quản lý thông tin trường', category: 'DANH_MUC_TO_CHUC', description: 'Cập nhật thông tin nhà trường, BGH và tổng số học sinh' },
  { key: 'org.manage_locations', name: 'Quản lý phân hiệu/điểm trường', category: 'DANH_MUC_TO_CHUC', description: 'Thêm, sửa, xóa, chỉ định trưởng điểm trường' },
  { key: 'org.manage_org_units', name: 'Quản lý tổ chuyên môn', category: 'DANH_MUC_TO_CHUC', description: 'Thêm, sửa, xóa, sắp xếp tổ/bộ phận' },
  { key: 'org.manage_classes', name: 'Quản lý lớp & số liệu học sinh', category: 'DANH_MUC_TO_CHUC', description: 'Cập nhật quy mô lớp học và phân bố học sinh' },
  { key: 'org.manage_staff', name: 'Phân công nhân sự', category: 'DANH_MUC_TO_CHUC', description: 'Phân công nhân sự vào phân hiệu và tổ chuyên môn' },
  { key: 'org.manage_categories', name: 'Quản lý danh mục dùng chung', category: 'DANH_MUC_TO_CHUC', description: 'Cấu hình năm học, học kỳ, chức danh, loại công việc' },

  // 6. QUAN_TRI_HE_THONG
  { key: 'account.view', name: 'Xem danh sách tài khoản', category: 'QUAN_TRI_HE_THONG', description: 'Xem danh sách nhân sự, trạng thái tài khoản và vai trò' },
  { key: 'account.create', name: 'Tạo tài khoản người dùng', category: 'QUAN_TRI_HE_THONG', description: 'Tạo tài khoản mới từ hồ sơ nhân sự theo hạn mức' },
  { key: 'account.update', name: 'Cập nhật tài khoản', category: 'QUAN_TRI_HE_THONG', description: 'Chỉnh sửa họ tên, email, số điện thoại, chức vụ' },
  { key: 'account.lock', name: 'Khóa / Mở khóa tài khoản', category: 'QUAN_TRI_HE_THONG', description: 'Tạm khóa hoặc kích hoạt lại quyền đăng nhập' },
  { key: 'account.reset_password', name: 'Đặt lại mật khẩu', category: 'QUAN_TRI_HE_THONG', description: 'Reset mật khẩu tài khoản về mặc định hoặc mật khẩu mới' },
  { key: 'account.assign_role', name: 'Gán vai trò & phạm vi', category: 'QUAN_TRI_HE_THONG', description: 'Gán vai trò và phạm vi (phân hiệu, tổ bộ phận) cho tài khoản' },
  { key: 'role.view', name: 'Xem danh mục vai trò & ma trận quyền', category: 'QUAN_TRI_HE_THONG', description: 'Xem ma trận phân quyền của các vai trò' },
  { key: 'role.create', name: 'Tạo vai trò tùy biến', category: 'QUAN_TRI_HE_THONG', description: 'Thêm vai trò mới và thiết lập tập quyền tương ứng' },
  { key: 'role.update', name: 'Cấu hình quyền cho vai trò', category: 'QUAN_TRI_HE_THONG', description: 'Chỉnh sửa thông tin vai trò và ma trận checkbox quyền' },
  { key: 'role.delete', name: 'Xóa vai trò tùy biến', category: 'QUAN_TRI_HE_THONG', description: 'Xóa vai trò tùy biến chưa gán cho tài khoản nào' },
  { key: 'audit.view', name: 'Xem nhật ký quản trị', category: 'QUAN_TRI_HE_THONG', description: 'Xem lịch sử các thao tác quản trị tài khoản, phân quyền' },
  { key: 'system.view_quota', name: 'Xem hạn mức gói thuê bao', category: 'QUAN_TRI_HE_THONG', description: 'Xem số lượng tài khoản đã dùng / tối đa, dung lượng lưu trữ' }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: SYSTEM_PERMISSIONS.map(p => p.key), // Admin trường có tất cả quyền trong tenant
  HIEU_TRUONG: [
    'plan.view', 'plan.view_all', 'plan.create', 'plan.edit', 'plan.delete', 'plan.approve', 'plan.export', 'plan.history',
    'task.view', 'task.view_all', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.update_progress', 'task.upload_evidence',
    'task.request_review', 'task.review', 'task.approve', 'task.request_revision', 'task.close', 'task.cancel', 'task.propose', 'task.approve_proposal',
    'task.comment', 'task.history', 'task.export',
    'kpi.view_personal', 'kpi.view_org', 'kpi.view_location', 'kpi.view_all', 'kpi.rate_4level', 'kpi.recompute', 'kpi.export',
    'report.view_dashboard', 'report.view_personal', 'report.view_org', 'report.view_school', 'report.export_excel', 'report.advanced_search',
    'org.view', 'org.manage_school', 'org.manage_locations', 'org.manage_org_units', 'org.manage_classes', 'org.manage_staff',
    'account.view'
  ],
  PHO_HIEU_TRUONG: [
    'plan.view', 'plan.view_all', 'plan.create', 'plan.edit', 'plan.export', 'plan.history',
    'task.view', 'task.view_all', 'task.create', 'task.edit', 'task.assign', 'task.update_progress', 'task.upload_evidence',
    'task.request_review', 'task.review', 'task.approve', 'task.request_revision', 'task.propose', 'task.approve_proposal',
    'task.comment', 'task.history', 'task.export',
    'kpi.view_personal', 'kpi.view_org', 'kpi.view_location', 'kpi.view_all', 'kpi.rate_4level', 'kpi.export',
    'report.view_dashboard', 'report.view_personal', 'report.view_org', 'report.view_school', 'report.export_excel', 'report.advanced_search',
    'org.view', 'account.view'
  ],
  TO_TRUONG: [
    'plan.view', 'plan.create', 'plan.edit', 'plan.export',
    'task.view', 'task.create', 'task.edit', 'task.assign', 'task.update_progress', 'task.upload_evidence',
    'task.request_review', 'task.review', 'task.request_revision', 'task.propose',
    'task.comment', 'task.history', 'task.export',
    'kpi.view_personal', 'kpi.view_org', 'kpi.export',
    'report.view_dashboard', 'report.view_personal', 'report.view_org', 'report.export_excel', 'report.advanced_search',
    'org.view'
  ],
  GIAO_VIEN: [
    'plan.view',
    'task.view', 'task.update_progress', 'task.upload_evidence', 'task.request_review', 'task.propose',
    'task.comment', 'task.history',
    'kpi.view_personal',
    'report.view_dashboard', 'report.view_personal',
    'org.view'
  ],
  NHAN_VIEN: [
    'plan.view',
    'task.view', 'task.update_progress', 'task.upload_evidence', 'task.request_review', 'task.propose',
    'task.comment', 'task.history',
    'kpi.view_personal',
    'report.view_dashboard', 'report.view_personal',
    'org.view'
  ]
};
