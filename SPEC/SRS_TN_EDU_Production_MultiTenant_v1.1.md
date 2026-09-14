
TN EDU
NỀN TẢNG QUẢN TRỊ TRƯỜNG PHỔ THÔNG ĐA TENANT (SaaS)
TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM
(SOFTWARE REQUIREMENTS SPECIFICATION – SRS)
BẢN PRODUCTION – PHIÊN BẢN ĐA TENANT (MULTI-SCHOOL SaaS)
Phiên bản: v1.1
Ngày lập: 14/09/2026 · Cập nhật: 14/09/2026
Công nghệ: Angular · Node.js · PostgreSQL
Căn cứ: SRS Demo TN EDU v0.1 (09/09/2026) · Feature List – Giải pháp Quản trị Trường phổ thông v1.0.1 (120 chức năng đã chốt sau demo với Ban Giám hiệu)

### Nhật ký thay đổi (Changelog)
| Phiên bản | Ngày | Nội dung thay đổi |
|---|---|---|
| v1.0 | 14/09/2026 | Bản SRS Production đa tenant đầu tiên, chương 5 mô tả theo nhóm ở dạng gộp/tóm lược, chưa liệt kê chi tiết từng dòng của Feature List v1.0.1. |
| **v1.1** | **14/09/2026** | **Viết lại chương 5** thành *Feature Register* — bảng liệt kê **đầy đủ nguyên văn cả 120/120 dòng** của Feature List v1.0.1 (TT, Tên chức năng, Mô tả nghiệp vụ giữ nguyên văn bản gốc), bổ sung 2 cột kỹ thuật cho mỗi dòng: **Permission key đề xuất** (khớp Permission Catalog mục 3.1/6) và **Trạng thái so với bản Demo** (đã có/cần bổ sung mới/mở rộng) để đội phát triển và Antigravity triển khai bám sát từng chức năng, không còn suy diễn hay gộp mô tả. Không có nội dung nghiệp vụ nào của bản v1.0 bị loại bỏ — phần narrative (bối cảnh, tiêu chí nghiệm thu theo nhóm) được giữ nguyên, bảng chi tiết được **chèn thêm** ngay sau mỗi nhóm.


1. Giới thiệu
1.1 Bối cảnh và mục tiêu nâng cấp lên nền tảng SaaS đa tenant
Bản Demo TN EDU (v0.1) đã chứng minh thành công 5 vấn đề vận hành cốt lõi của Ban Giám hiệu tại một trường liên cấp nhiều điểm trường. Sau buổi demo, danh sách chức năng đã được chốt với Ban Giám hiệu (Feature List v1.0.1, 120 chức năng), đồng thời phát sinh một yêu cầu chiến lược mới: xây dựng hệ thống theo mô hình SaaS đa tenant (multi-tenant) để có thể cho nhiều trường khác nhau thuê bao và sử dụng trên cùng một nền tảng, thay vì chỉ triển khai riêng lẻ cho từng trường.
Đặc điểm cốt lõi của mô hình đa tenant theo yêu cầu:
Dùng chung một địa chỉ/link đăng nhập (một domain ứng dụng duy nhất) cho tất cả các trường.
Sau khi đăng nhập, hệ thống tự động xác định trường (tenant) của tài khoản và chỉ khởi tạo/hiển thị dữ liệu riêng của trường đó — dữ liệu giữa các trường cô lập tuyệt đối.
Có một lớp quản trị hệ thống (System Admin) độc lập, nằm ngoài mọi tenant, chịu trách nhiệm khởi tạo tenant mới và tài khoản quản trị (Tenant Admin) đầu tiên cho từng trường.
Phân quyền nghiệp vụ được cấu hình riêng cho từng tenant, theo đúng cơ cấu tổ chức và nhu cầu điều hành của lãnh đạo từng trường (mỗi trường có thể có cơ cấu, vai trò đặc thù khác nhau).
Mỗi trường tự cấu hình thông tin của mình (thông tin trường, phân hiệu, tổ chức, danh mục, KPI...) một cách độc lập, không ảnh hưởng tới trường khác.
Về quy mô, hệ thống khởi động với khoảng 1.000 tài khoản (một số trường triển khai đầu tiên) và phải được thiết kế để chịu tải đến 5.000 tài khoản đồng thời trên nhiều tenant trong giai đoạn tiếp theo, khi nền tảng được thương mại hóa và mở rộng cho nhiều trường hơn.
1.2 Mục đích tài liệu
Tài liệu này đặc tả yêu cầu phần mềm cho phiên bản PRODUCTION của TN EDU theo mô hình SaaS đa tenant, làm cơ sở để: (a) đội phát triển triển khai nâng cấp từ mã nguồn bản demo hiện có; (b) công cụ lập trình AI (Antigravity) sử dụng làm ngữ cảnh kỹ thuật để sinh/tái cấu trúc mã nguồn; (c) Ban Giám hiệu các trường và đơn vị vận hành nền tảng nghiệm thu sản phẩm trước khi vận hành chính thức.
1.3 Phạm vi tài liệu
SRS này thay thế và mở rộng SRS Demo v0.1, dựa trên toàn bộ 120 chức năng trong Feature List v1.0.1 đã được chốt (bao gồm cả nhóm KPI, vốn nằm ngoài phạm vi demo trước đây nhưng nay đã chính thức đưa vào phạm vi Production). Phạm vi bổ sung quan trọng nhất so với bản demo là toàn bộ lớp kiến trúc và nghiệp vụ đa tenant: System Admin, quản lý gói thuê, cô lập dữ liệu, và phân quyền tùy biến theo từng trường.
Các hạng mục sau vẫn ngoài phạm vi Production lần này, thuộc lộ trình các giai đoạn kế tiếp (xem mục 4.3): AI Copilot điều hành, OCR/xử lý văn bản tự động, SSO/Zalo OA/chữ ký số, tích hợp CSDL ngành GD-ĐT/LMS/lịch ngoài, Data Warehouse/BI nâng cao, ứng dụng mobile app native (bản Production ưu tiên web responsive/PWA).
1.4 Đối tượng đọc tài liệu
Đơn vị vận hành nền tảng (chủ đầu tư SaaS), Ban Giám hiệu các trường khách hàng, đội phát triển phần mềm, và công cụ lập trình AI (Antigravity) sử dụng tài liệu này cùng Bộ Prompt nâng cấp đi kèm để triển khai/tái cấu trúc mã nguồn.
1.5 Thuật ngữ và từ viết tắt
Thuật ngữ
Giải thích
Tenant
Một trường học đang thuê bao sử dụng nền tảng; đơn vị cô lập dữ liệu cơ bản của hệ thống.
System Admin
Quản trị viên nền tảng (bên vận hành SaaS), quản lý toàn bộ tenant, không thuộc trường nào.
Tenant Admin (Admin trường)
Quản trị viên cao nhất trong phạm vi 1 tenant, do System Admin khởi tạo tài khoản đầu tiên.
Multi-tenancy
Kiến trúc cho phép nhiều khách hàng (tenant) dùng chung một hệ thống/hạ tầng nhưng dữ liệu cô lập.
RLS (Row-Level Security)
Cơ chế của PostgreSQL giới hạn quyền truy cập theo từng dòng dữ liệu dựa trên điều kiện (ở đây là tenant_id).
Gói thuê (Package/Plan)
Gói dịch vụ thương mại xác định hạn mức tài khoản, module được bật, thời hạn sử dụng của một tenant.
BGH
Ban Giám hiệu (Hiệu trưởng + các Phó Hiệu trưởng).
PHT
Phó Hiệu trưởng.
Phân hiệu / Điểm trường
Cơ sở vật chất nơi diễn ra hoạt động dạy học, thuộc về một tenant duy nhất.
RACI
Mô hình phân vai: Responsible (chủ trì), Accountable (chịu trách nhiệm/phê duyệt), Consulted (tham vấn/hỗ trợ), Informed (được thông báo).
KPI
Chỉ số đánh giá hiệu quả công việc, tính tự động từ công việc hoặc nhập thủ công theo danh mục cấu hình.
Permission catalog
Danh mục các quyền (permission key) cố định do nền tảng định nghĩa, dùng để mỗi tenant lắp ráp thành vai trò riêng.

2. Mô hình đa tenant (SaaS Architecture)
Đây là chương quan trọng nhất phân biệt bản Production với bản Demo. Mọi module nghiệp vụ ở chương 5 đều phải tuân thủ các nguyên tắc cô lập dữ liệu và phân quyền theo tenant nêu tại đây.
2.1 Chiến lược multi-tenancy được lựa chọn
Ba mô hình multi-tenancy phổ biến được cân nhắc:
Mô hình
Mô tả
Đánh giá cho TN EDU
Database riêng / tenant
Mỗi trường một database PostgreSQL riêng biệt
Cô lập tốt nhất nhưng chi phí vận hành, migration, backup nhân theo số trường — không phù hợp giai đoạn 1.000-5.000 tài khoản/nhiều trường vừa và nhỏ
Schema riêng / tenant
Một database, mỗi trường một schema PostgreSQL riêng
Cô lập khá tốt nhưng migration & connection pooling phức tạp khi số trường tăng nhanh
Shared schema + tenant_id + RLS (chọn)
Một database, một schema dùng chung; mọi bảng nghiệp vụ có cột tenant_id; PostgreSQL Row-Level Security (RLS) enforce cô lập ở tầng CSDL, cộng thêm lọc ở tầng ứng dụng
Chi phí vận hành thấp, mở rộng ngang dễ, phù hợp quy mô 1.000→5.000 tài khoản/nhiều tenant; vẫn đảm bảo cô lập dữ liệu 2 lớp (ứng dụng + CSDL)
Lưu ý: Kiến trúc chọn Shared schema + tenant_id + RLS làm nền tảng chính thức. Thiết kế bảng và service layer phải giữ tenant_id tách bạch rõ ràng để có thể tách sang schema/DB riêng cho một khách hàng lớn đặc thù trong tương lai mà không phải viết lại từ đầu.
2.2 Luồng đăng nhập dùng chung một link
Theo đúng yêu cầu "chung link đăng nhập nhưng vào sẽ khởi tạo dữ liệu riêng của trường", hệ thống KHÔNG dùng subdomain riêng cho từng trường ở giai đoạn Production đầu tiên, mà xác định tenant dựa trên chính tài khoản đăng nhập:
1. Người dùng truy cập một địa chỉ ứng dụng duy nhất (ví dụ app.tnedu.vn) và nhập tài khoản (số điện thoại/email) + mật khẩu.
2. Tài khoản (User) là duy nhất trên toàn hệ thống (unique theo phone/email ở phạm vi global) và luôn gắn với đúng 1 tenant_id.
3. Backend xác thực tài khoản, tra ra tenant_id tương ứng, phát hành JWT chứa: userId, tenantId, roles[], scope (điểm trường/tổ phụ trách).
4. Toàn bộ API nghiệp vụ sau đó bắt buộc đọc tenantId từ JWT đã xác thực (không bao giờ tin tenantId do client tự gửi lên) để làm điều kiện lọc dữ liệu.
5. Trường hợp một người có vai trò ở nhiều trường khác nhau (hiếm gặp, thuộc roadmap mở rộng): sau đăng nhập hệ thống hiển thị màn hình chọn "ngữ cảnh trường đang làm việc" trước khi vào Dashboard.
Tiêu chí nghiệm thu:
Hai tài khoản thuộc hai tenant khác nhau, dù trùng thao tác, luôn thấy dữ liệu (kế hoạch, công việc, nhân sự, KPI...) hoàn toàn khác nhau và không thể truy cập chéo qua bất kỳ API nào.
Không tồn tại tham số tenantId/schoolId có thể chỉnh sửa từ phía client (URL, body, header) làm thay đổi được phạm vi dữ liệu trả về.
2.3 Tách bạch hai lớp quản trị
Lớp quản trị
Phạm vi
Không được làm
System Admin (quản trị nền tảng)
Toàn bộ tenant: khởi tạo/khoá/mở tenant, quản lý gói thuê, theo dõi thời hạn, khởi tạo tài khoản Tenant Admin đầu tiên cho mỗi trường
Không truy cập trực tiếp dữ liệu nghiệp vụ nội bộ của trường (kế hoạch, công việc, KPI, minh chứng...) trong điều kiện vận hành bình thường; mọi truy cập hỗ trợ kỹ thuật đặc biệt (impersonation) phải được ghi log riêng, có cảnh báo và giới hạn thời gian
Tenant Admin (Admin trường)
Toàn bộ cấu hình và nghiệp vụ bên trong đúng 1 tenant: thông tin trường, phân hiệu, tổ chức, nhân sự, tài khoản, phân quyền, danh mục, KPI framework
Không nhìn thấy hoặc thao tác được với dữ liệu của tenant khác dưới bất kỳ hình thức nào; không tự thay đổi gói thuê/hạn mức tài khoản do System Admin quản lý
2.4 Nguyên tắc cô lập dữ liệu (Data Isolation Guarantee)
Mọi bảng dữ liệu nghiệp vụ đều có cột tenant_id NOT NULL, được index cùng các cột lọc thường dùng (ví dụ (tenant_id, status, due_date), (tenant_id, org_unit_id)).
Áp dụng PostgreSQL Row-Level Security (RLS) trên mọi bảng nghiệp vụ: policy USING (tenant_id = current_setting('app.current_tenant')::uuid) — được backend SET ngay đầu mỗi transaction/connection theo tenant của request, làm lớp phòng vệ thứ 2 độc lập với logic ứng dụng.
Tầng ứng dụng (ORM) áp dụng tenant scope tự động (ví dụ base repository/service luôn where tenant_id = ctx.tenantId), không cho phép truy vấn thô bỏ qua điều kiện này ở các module nghiệp vụ.
File minh chứng lưu theo đường dẫn/khóa đối tượng phân theo tenant (ví dụ /{tenantId}/tasks/{taskId}/..., hoặc S3 prefix theo tenant), không dùng chung thư mục gốc.
Giới hạn tài nguyên (rate limit API, hạn mức tài khoản, dung lượng lưu trữ minh chứng) áp dụng theo tenant, dựa trên gói thuê đã gán, tránh một tenant ảnh hưởng hiệu năng tenant khác (noisy neighbor).
Mọi log ứng dụng, log lỗi, audit log đều gắn kèm tenant_id để phục vụ tra soát và hỗ trợ kỹ thuật đúng phạm vi.

3. Người dùng & Vai trò (Actors)
Mô hình tổ chức kế thừa từ bản demo (Hiệu trưởng → Phó Hiệu trưởng → Tổ trưởng/Trưởng bộ phận → Giáo viên/Nhân viên), bổ sung 2 vai trò quản trị mới phục vụ mô hình đa tenant.
Vai trò
Phạm vi dữ liệu
Nhóm quyền chính (tham chiếu Feature List)
System Admin
Toàn hệ thống, ngoài mọi tenant
Quản lý tenant, gói thuê, tài khoản Tenant Admin (TT 26–33)
Tenant Admin (Admin trường)
Toàn bộ 1 tenant (trường)
Thông tin trường, phân hiệu, lớp, tổ chức, nhân sự, tài khoản, phân quyền, danh mục, cấu hình KPI (TT 34–51)
Hiệu trưởng
Toàn trường (trong tenant)
Dashboard toàn trường, kế hoạch, giao việc, kiểm tra/phê duyệt, đánh giá, KPI, báo cáo, duyệt đề xuất (TT 52–77)
Phó Hiệu trưởng
Phân hiệu/phạm vi được Hiệu trưởng giao
Dashboard phạm vi phụ trách, kế hoạch, giao việc cho tổ/cá nhân, kiểm tra/phê duyệt, KPI phạm vi (TT 78–93)
Tổ trưởng / Trưởng bộ phận
Tổ chuyên môn / bộ phận phụ trách
Nhận việc từ cấp trên, giao việc cho thành viên, theo dõi & kiểm tra tổ, KPI, báo cáo tổ (TT 94–104)
Giáo viên / Nhân viên
Công việc cá nhân liên quan
Nhận việc, cập nhật tiến độ/kết quả/minh chứng, đề xuất việc, KPI cá nhân (TT 105–120)
3.1 Phân quyền tùy biến theo từng tenant
Khác với bản demo (ma trận quyền cố định theo vai trò), bản Production cho phép mỗi trường tự cấu hình phân quyền phù hợp cơ cấu tổ chức và nhu cầu điều hành riêng — đáp ứng trực tiếp yêu cầu "phân quyền thì làm riêng cho từng tenant (theo nhu cầu lãnh đạo trường)".
Nền tảng định nghĩa sẵn một Permission Catalog cố định (khoảng 60–90 permission key, ví dụ plan.create, task.approve, kpi.view_all, account.reset_password...) — Tenant Admin không tự tạo permission key mới, chỉ lắp ráp để giữ hệ thống ổn định và dễ bảo trì.
6 vai trò chuẩn (System Admin, Tenant Admin, Hiệu trưởng, PHT, Tổ trưởng/Trưởng bộ phận, Giáo viên/Nhân viên) là mặc định (seed) cho mọi tenant mới, có thể chỉnh sửa tập quyền chi tiết trong nội bộ tenant đó.
Tenant Admin có thể tạo thêm vai trò tùy biến (custom role, ví dụ "Trưởng ban Đoàn thể", "Thư ký Hội đồng") và gán tập permission phù hợp, hoàn toàn độc lập với tenant khác.
Phân quyền gồm 2 chiều: (1) Quyền chức năng (làm được thao tác gì — permission key) và (2) Phạm vi dữ liệu (xem/thao tác trên phạm vi nào: toàn trường / một phân hiệu / một tổ-bộ phận), áp dụng đồng thời cho mỗi tài khoản (giữ nguyên tinh thần mục 5.11 SRS Demo, mở rộng thành cấu hình được thay vì cố định cứng).
Tiêu chí nghiệm thu:
Hai trường khác nhau có thể cấu hình cho cùng vai trò "Tổ trưởng" hai tập quyền khác nhau (ví dụ trường A cho Tổ trưởng quyền phê duyệt cấp 1, trường B thì không) mà không cần đội phát triển can thiệp mã nguồn.
Tenant Admin tạo được 1 vai trò tùy biến mới, gán quyền, gán cho 1 tài khoản và tài khoản đó đăng nhập có đúng quyền cấu hình.

4. Phạm vi chức năng bản Production
4.1 Nguyên tắc
Toàn bộ 120 chức năng trong "Feature List – Giải pháp Quản trị Trường phổ thông v1.0.1" được đưa vào phạm vi Production, tổ chức lại thành 7 nhóm để đặc tả chi tiết ở chương 5. Mã TT trong bảng dưới tương ứng đúng số thứ tự trong Feature List gốc để tiện đối chiếu khi phát triển.
4.2 Bảng nhóm module
Nhóm
Phạm vi
Mã TT tham chiếu
Số chức năng
A. Nền tảng dùng chung
Đăng nhập, hồ sơ, công việc, minh chứng, trao đổi, thông báo, nhắc việc, nhật ký, tìm kiếm, lọc, báo cáo — dùng chung cho mọi vai trò
1–25
25
B. System Admin (đa tenant)
Quản lý tenant, gói thuê, tài khoản Tenant Admin
26–33
8
C. Admin trường (Tenant Admin)
Thông tin trường, phân hiệu, lớp, học sinh, tổ chức, nhân sự, tài khoản, phân quyền, KPI, danh mục
34–51
18
D. Hiệu trưởng
Dashboard, kế hoạch, giao việc, công việc toàn trường, kiểm tra, phê duyệt, đánh giá, KPI, minh chứng, báo cáo, đề xuất
52–77
26
E. Phó Hiệu trưởng
Dashboard phạm vi, kế hoạch, công việc, giao việc, kiểm tra, phê duyệt, đánh giá, KPI, báo cáo, minh chứng
78–93
16
F. Tổ trưởng / Trưởng bộ phận
Dashboard, nhận việc, giao việc, RACI, theo dõi, kiểm tra, trao đổi, KPI, báo cáo tổ
94–104
11
G. Giáo viên / Nhân viên
Dashboard cá nhân, nhận việc, cập nhật, minh chứng, đề xuất, trao đổi, KPI cá nhân
105–120
16
4.3 Ngoài phạm vi Production (Out of scope – lộ trình các giai đoạn sau)
AI Copilot điều hành, AI xử lý văn bản/OCR, AI phân tích rủi ro.
SSO, Zalo OA, chữ ký số, tích hợp CSDL ngành GD-ĐT, LMS, lịch Google/Microsoft, webhook, API bên thứ ba.
Data Warehouse, BI nâng cao, tìm kiếm toàn văn nâng cao, archive/retention nâng cao.
Ứng dụng mobile app native (iOS/Android) — giai đoạn Production ưu tiên web responsive/PWA, mobile app có thể xem xét khi số tenant đủ lớn.
Subdomain/tên miền riêng theo từng trường (white-label domain) — Production dùng chung một domain theo mục 2.2, việc tách subdomain là lộ trình mở rộng.

5. Yêu cầu chức năng chi tiết
5.0 Cách đọc chương này — Feature Register đầy đủ 120/120 chức năng
Mỗi nhóm dưới đây giữ nguyên phần narrative (bối cảnh nghiệp vụ, tiêu chí nghiệm thu) của bản v1.0, đồng thời bổ sung thêm một "Bảng đặc tả chi tiết" tái hiện NGUYÊN VĂN, ĐẦY ĐỦ, KHÔNG BỎ SÓT BẤT KỲ DÒNG NÀO trong 120 dòng của Feature List – Giải pháp Quản trị Trường phổ thông v1.0.1 (cột Tên chức năng và Mô tả nghiệp vụ giữ 100% văn bản gốc, không diễn giải lại, không rút gọn). Mỗi dòng được bổ sung 2 cột kỹ thuật để đội phát triển/Antigravity triển khai trực tiếp: Permission key đề xuất (khớp Permission Catalog mục 3.1/6) và Trạng thái so với bản Demo (kế thừa / cần bổ sung mới / mở rộng / mới hoàn toàn).
5.1 Nhóm A – Nền tảng dùng chung (TT 1–25)
Đây là bộ khung nghiệp vụ lõi mà mọi vai trò đều sử dụng hằng ngày, kế thừa gần như nguyên vẹn thiết kế UX của bản demo (M1, M6, M7, M8, M9), mở rộng thêm minh chứng tập trung, trao đổi/mention, nhật ký, tìm kiếm và báo cáo theo kỳ.
5.1.1 Đăng nhập, hồ sơ cá nhân (TT 1–3)
Đăng nhập xác định tenant theo đúng luồng mục 2.2. Người dùng xem/sửa hồ sơ cá nhân (họ tên, chức vụ, tổ/bộ phận, phân hiệu, liên hệ), tự đổi mật khẩu.
5.1.2 Công việc & RACI (TT 4–10)
Danh sách "Công việc liên quan" theo 4 vai trò RACI, xem chi tiết đầy đủ (nội dung, hạn, trạng thái, người giao/thực hiện/phối hợp, phân hiệu, tổ, kế hoạch liên quan, minh chứng, lịch sử xử lý), cập nhật tiến độ (%), cập nhật kết quả, đính kèm minh chứng (ảnh/PDF/Word/Excel...). Trạng thái chuẩn: Chưa thực hiện → Đang thực hiện → Chờ kiểm tra/phê duyệt → (Yêu cầu bổ sung → quay lại) → Hoàn thành; có thêm trạng thái phụ Quá hạn tính tự động theo dueDate.
5.1.3 Minh chứng, trao đổi, tiện ích (TT 11–15)
Kho minh chứng số tập trung toàn bộ minh chứng từ công việc/kế hoạch/KPI, tìm kiếm đa tiêu chí (tên tài liệu, công việc, người cập nhật, thời gian, phân hiệu, tổ, loại minh chứng) trong phạm vi được cấp quyền. Trao đổi ngay trong từng công việc, hỗ trợ @mention gửi thông báo. Click-to-call (tel:) tại mọi nơi hiển thị số điện thoại.
5.1.4 Thông báo, nhắc việc, nhật ký (TT 16–21)
Trung tâm thông báo tập trung; tự động nhắc việc mới/sắp hạn/quá hạn; nhật ký ghi lại mọi chỉnh sửa quan trọng của công việc và kế hoạch (người sửa, thời điểm, nội dung thay đổi) phục vụ truy vết.
5.1.5 Tìm kiếm, lọc, báo cáo (TT 22–25)
Tìm kiếm toàn hệ thống (kế hoạch, công việc, nhân sự, minh chứng) trong đúng phạm vi tenant + phạm vi quyền của người dùng. Bộ lọc theo năm học, thời gian, phân hiệu, tổ/bộ phận, cá nhân, trạng thái, tiến độ, loại công việc. Báo cáo công việc theo kỳ và xuất Excel.
Tiêu chí nghiệm thu:
Người dùng ở vai trò bất kỳ chỉ tìm thấy dữ liệu trong đúng tenant và đúng phạm vi quyền của mình khi dùng Tìm kiếm toàn hệ thống.
Đính kèm 1 minh chứng và cập nhật % tiến độ thực hiện được trong tối đa 3 thao tác chạm trên điện thoại.
100% thay đổi trạng thái quan trọng của công việc sinh thông báo, kiểm chứng được trong Trung tâm thông báo.

5.1.6 Bảng đặc tả chi tiết – Nhóm A (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 1–25)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **001** | Đăng nhập hệ thống | Người dùng đăng nhập bằng tài khoản được cấp; hệ thống xác định tenant, vai trò và phạm vi dữ liệu được phép truy cập. | `auth.login` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **002** | Xem thông tin cá nhân | Xem họ tên, chức vụ, tổ/bộ phận, phân hiệu, số điện thoại, thông tin liên hệ và các vai trò đang đảm nhiệm. | `profile.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **003** | Đổi mật khẩu | Cho phép người dùng chủ động thay đổi mật khẩu tài khoản. | `profile.change_password` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **004** | Danh sách công việc liên quan | Hiển thị các công việc người dùng là người thực hiện, người chịu trách nhiệm, người hỗ trợ, người kiểm tra hoặc người cần được thông báo. | `task.view_related` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **005** | Xem chi tiết công việc | Xem nội dung, thời hạn, trạng thái, người giao, người thực hiện, người phối hợp, phân hiệu, tổ/bộ phận, kế hoạch liên quan, minh chứng và lịch sử xử lý. | `task.view_detail` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **006** | Phân công theo RACI | Mỗi công việc có thể xác định: người thực hiện chính (Responsible), người chịu trách nhiệm/phê duyệt (Accountable), người tham vấn/hỗ trợ (Consulted) và người được thông báo (Informed). | `task.raci.assign` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **007** | Trạng thái công việc | Theo dõi các trạng thái cơ bản như: Chưa thực hiện, Đang thực hiện, Chờ kiểm tra/phê duyệt, Yêu cầu bổ sung, Hoàn thành, Quá hạn. | `task.status.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **008** | Cập nhật tiến độ | Người được quyền nhập % hoàn thành, nội dung đã thực hiện, khó khăn/vướng mắc và kết quả hiện tại. | `task.progress.update` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **009** | Cập nhật kết quả | Nhập kết quả thực tế sau khi thực hiện công việc, sản phẩm đầu ra và ghi chú liên quan. | `task.result.update` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **010** | Đính kèm minh chứng | Tải lên ảnh, PDF, Word, Excel hoặc tài liệu khác làm minh chứng cho quá trình và kết quả thực hiện công việc. | `task.attachment.upload` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **011** | Kho minh chứng số | Tập trung các minh chứng được tạo từ công việc, kế hoạch và KPI để tìm kiếm và khai thác lại. | `evidence.repository.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **012** | Tìm kiếm minh chứng | Tìm theo tên tài liệu, công việc, người cập nhật, khoảng thời gian, phân hiệu, tổ/bộ phận hoặc loại minh chứng. | `evidence.search` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **013** | Trao đổi trong công việc | Thành viên liên quan trao đổi trực tiếp trong từng công việc nhằm hạn chế trao đổi rời rạc qua nhiều kênh. | `task.comment.create` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **014** | Mention người dùng | Cho phép sử dụng @Tên để nhắc một cá nhân vào nội dung trao đổi; người được mention nhận thông báo. | `task.comment.mention` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **015** | Gọi điện giáo viên/nhân viên | Tại thông tin người dùng, nhấn số điện thoại để thực hiện cuộc gọi trên thiết bị hỗ trợ. | `contact.call` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **016** | Trung tâm thông báo | Hiển thị tập trung các thông báo về giao việc, cập nhật, yêu cầu bổ sung, phê duyệt, mention và các sự kiện liên quan. | `notification.center.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **017** | Nhắc công việc mới | Thông báo khi người dùng được giao công việc mới hoặc tham gia một công việc. | `(tự động – hệ thống sinh, không cần permission riêng)` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **018** | Nhắc việc sắp đến hạn | Tự động cảnh báo các công việc sắp hết thời hạn. | `(tự động – hệ thống sinh, không cần permission riêng)` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **019** | Nhắc việc quá hạn | Tự động cảnh báo khi công việc hết hạn nhưng chưa hoàn thành. | `(tự động – hệ thống sinh, không cần permission riêng)` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **020** | Nhật ký chỉnh sửa công việc | Ghi lại người sửa, thời điểm sửa và các thông tin quan trọng đã thay đổi. | `task.log.view` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **021** | Nhật ký chỉnh sửa kế hoạch | Lưu lịch sử thay đổi nội dung, thời hạn, người phụ trách và cấu trúc của kế hoạch. | `plan.log.view` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **022** | Tìm kiếm toàn hệ thống | Tìm kiếm kế hoạch, công việc, giáo viên/nhân viên và minh chứng trong phạm vi dữ liệu được cấp quyền. | `search.global` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **023** | Bộ lọc dữ liệu | Lọc theo năm học, thời gian, phân hiệu, tổ/bộ phận, cá nhân, trạng thái, tiến độ và loại công việc. | `(tham số lọc – áp dụng trên mọi API danh sách theo phạm vi quyền)` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **024** | Báo cáo công việc theo kỳ | Tổng hợp công việc theo tuần, tháng, học kỳ hoặc khoảng thời gian lựa chọn. | `report.task.view` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **025** | Xuất dữ liệu Excel | Xuất danh sách công việc, báo cáo KPI và một số báo cáo tổng hợp ra Excel. | `report.export_excel` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |


5.2 Nhóm B – System Admin (quản trị nền tảng đa tenant) (TT 26–33)
Tác nhân: System Admin. Đây là phân hệ hoàn toàn mới so với bản demo, vận hành ngoài phạm vi mọi tenant, phục vụ đội ngũ kinh doanh/vận hành nền tảng SaaS.
5.2.1 Quản lý tenant
Xem danh sách tất cả các trường đang sử dụng nền tảng (tên trường, mã tenant, gói thuê, trạng thái hoạt động, số tài khoản đã dùng/hạn mức).
Thêm tenant mới: nhập thông tin trường ban đầu, hệ thống sinh mã tenant duy nhất, khởi tạo schema dữ liệu trống (seed danh mục mặc định, 6 vai trò chuẩn) cho tenant.
Cập nhật tenant: đổi tên trường, trạng thái hoạt động, thông tin cấu hình cơ bản ở tầng nền tảng (không đụng vào dữ liệu nghiệp vụ nội bộ trường).
Khoá/Mở tenant: tạm ngừng toàn bộ truy cập của một trường (ví dụ hết hạn hợp đồng) — mọi tài khoản thuộc tenant bị khoá không đăng nhập được cho tới khi mở lại; dữ liệu được giữ nguyên, không xoá.
5.2.2 Quản lý gói thuê (Package) & thời hạn
Khai báo các gói thuê theo chính sách kinh doanh (ví dụ Cơ bản/Nâng cao), mỗi gói xác định: số tài khoản tối đa, dung lượng lưu trữ minh chứng, các module được bật (ví dụ có/không có KPI nâng cao).
Gán gói thuê cho từng tenant kèm thời gian hiệu lực (ngày bắt đầu/kết thúc), hạn mức tài khoản áp dụng cho tenant đó.
Theo dõi thời hạn: danh sách tenant sắp hết hạn/đã hết hạn để chủ động gia hạn, cảnh báo tự động trước khi hết hạn (ví dụ 30/15/7 ngày).
5.2.3 Khởi tạo tài khoản Tenant Admin
Sau khi tạo tenant, System Admin khởi tạo tài khoản Tenant Admin đầu tiên (họ tên, email/số điện thoại, mật khẩu tạm) — Tenant Admin dùng tài khoản này để tự cấu hình toàn bộ phần còn lại của trường (chương 5.3).
Tiêu chí nghiệm thu:
Tạo được 1 tenant mới, gán gói thuê, khởi tạo tài khoản Tenant Admin, và tài khoản đó đăng nhập được ngay để bắt đầu cấu hình trường — toàn bộ trong một luồng liền mạch không cần can thiệp CSDL thủ công.
Khoá 1 tenant thì toàn bộ tài khoản thuộc tenant đó không đăng nhập được; mở khoá lại thì hoạt động bình thường, dữ liệu không bị mất.
Tenant đạt đến hạn mức tài khoản theo gói thuê thì Tenant Admin không tạo thêm được tài khoản mới, có thông báo rõ lý do và hướng dẫn liên hệ nâng cấp gói.

5.2.4 Bảng đặc tả chi tiết – Nhóm B (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 26–33)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **026** | Danh sách tenant | Xem danh sách các trường đang sử dụng hệ thống. | `system-admin.tenant.view` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **027** | Thêm tenant | Khởi tạo một trường mới trên nền tảng, tạo mã tenant và các thông tin ban đầu. | `system-admin.tenant.create` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **028** | Cập nhật tenant | Thay đổi tên trường, trạng thái hoạt động và thông tin cấu hình cơ bản. | `system-admin.tenant.update` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **029** | Khóa/Mở tenant | Tạm ngừng hoặc kích hoạt lại quyền sử dụng hệ thống của trường. | `system-admin.tenant.lock_unlock` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **030** | Quản lý gói thuê | Khai báo các gói sử dụng phần mềm theo chính sách kinh doanh. | `system-admin.package.manage` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **031** | Gán gói thuê cho tenant | Xác định gói thuê, thời gian hiệu lực, số lượng tài khoản hoặc hạn mức sử dụng của từng trường. | `system-admin.subscription.assign` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **032** | Theo dõi thời hạn thuê | Theo dõi ngày bắt đầu, ngày hết hạn và trạng thái gói dịch vụ của từng tenant. | `system-admin.subscription.monitor` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |
| **033** | Tài khoản Tenant Admin | Khởi tạo tài khoản quản trị ban đầu cho từng trường. | `system-admin.tenant_admin.create` | **MỚI HOÀN TOÀN** — module System Admin không tồn tại ở bản demo, phải xây từ đầu theo Phase 1. |


5.3 Nhóm C – Admin trường (Tenant Admin) (TT 34–51)
Tác nhân: Tenant Admin, Hiệu trưởng (thường được gán kèm quyền Admin trường). Toàn bộ chức năng nhóm này nằm trong đúng 1 tenant, đáp ứng yêu cầu "các trường tự cấu hình thông tin độc lập".
5.3.1 Thông tin nhà trường & phân hiệu (TT 34–36)
Cập nhật mã trường, tên trường, địa chỉ, thông tin liên hệ, năm học hiện tại. Khai báo điểm chính và các phân hiệu; quản lý tên, địa chỉ, người phụ trách và số liệu cơ bản của từng phân hiệu.
5.3.2 Lớp học & số liệu học sinh (TT 37–38)
Khai báo danh sách lớp theo năm học/khối lớp/phân hiệu. Quản lý số liệu học sinh phục vụ thống kê quản trị (tổng số, nam/nữ, các chỉ tiêu cần thiết) — phiên bản Production chưa quản lý hồ sơ học sinh chi tiết từng em, thuộc lộ trình mở rộng sau.
5.3.3 Tổ chức & nhân sự (TT 39–43)
Khai báo tổ chuyên môn, bộ phận (Văn phòng, Y tế, Thư viện, Thiết bị, CNTT...). Quản lý danh sách giáo viên/nhân viên (họ tên, chức vụ, phân hiệu, tổ/bộ phận, số điện thoại, trạng thái làm việc); phân công một người vào một hoặc nhiều phân hiệu và tổ/bộ phận.
5.3.4 Tài khoản & phân quyền (TT 44–48)
Tạo tài khoản người dùng trực tiếp từ danh sách nhân sự đã khai báo (tránh nhập trùng lặp thông tin).
Khoá/Mở tài khoản; cấp lại mật khẩu khi người dùng quên.
Phân quyền chức năng: gán vai trò chuẩn hoặc vai trò tùy biến cho từng tài khoản (theo mục 3.1).
Phân quyền phạm vi dữ liệu: xác định tài khoản xem toàn trường, một phân hiệu, một tổ chuyên môn hay một bộ phận cụ thể.
5.3.5 Cấu hình KPI & danh mục dùng chung (TT 49–51)
Khai báo danh mục KPI khác ngoài KPI tự tính từ công việc (tên KPI, đơn vị tính, mức đạt/chỉ tiêu, đối tượng áp dụng). Quản lý danh mục dùng chung: loại công việc, mức ưu tiên, trạng thái, loại minh chứng, đơn vị tính — tất cả cấu hình này chỉ áp dụng trong phạm vi tenant của trường đó.
Tiêu chí nghiệm thu:
Tenant Admin thực hiện được toàn bộ vòng đời cấu hình một trường mới (thông tin trường → phân hiệu → tổ chức → nhân sự → tài khoản → phân quyền → danh mục) mà không cần hỗ trợ kỹ thuật từ System Admin.
Chuyển 1 giáo viên từ phân hiệu này sang phân hiệu khác trong tối đa 3 lần bấm, giáo viên đó xuất hiện đúng trong danh sách nhân sự của phân hiệu mới ngay lập tức.
Xoá một phân hiệu chỉ được phép khi không còn nhân sự/công việc gắn với phân hiệu đó, ngược lại hệ thống báo rõ lý do không xoá được.

5.3.6 Bảng đặc tả chi tiết – Nhóm C (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 34–51)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **034** | Thông tin nhà trường | Cập nhật mã trường, tên trường, địa chỉ, thông tin liên hệ và năm học hiện tại. | `tenant-admin.school.update` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **035** | Danh sách phân hiệu/điểm trường | Khai báo điểm chính và các phân hiệu thuộc trường. | `tenant-admin.location.list` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **036** | Thông tin phân hiệu | Quản lý tên, địa chỉ, người phụ trách và một số số liệu cơ bản của từng phân hiệu. | `tenant-admin.location.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **037** | Danh sách lớp | Khai báo các lớp theo năm học, khối lớp và phân hiệu. | `tenant-admin.class.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **038** | Số liệu học sinh | Quản lý các số liệu phục vụ quản trị như tổng học sinh, nam, nữ và các chỉ tiêu thống kê cần thiết; Version 1.0 chưa cần quản lý hồ sơ chi tiết từng học sinh. | `tenant-admin.student_stat.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **039** | Danh sách tổ chuyên môn | Khai báo các tổ chuyên môn của toàn trường. | `tenant-admin.org_unit.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **040** | Danh sách bộ phận | Khai báo các bộ phận như Văn phòng, Y tế, Thư viện, Thiết bị, CNTT... | `tenant-admin.org_unit.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **041** | Danh sách giáo viên/nhân viên | Quản lý họ tên, chức vụ/chức danh, phân hiệu, tổ/bộ phận, số điện thoại và trạng thái làm việc. | `tenant-admin.staff.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **042** | Phân công phân hiệu | Một giáo viên/nhân viên có thể được gán làm việc tại một hoặc nhiều phân hiệu. | `tenant-admin.staff.assign_location` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **043** | Phân công tổ/bộ phận | Xác định giáo viên/nhân viên thuộc tổ chuyên môn hoặc bộ phận nào. | `tenant-admin.staff.assign_org_unit` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **044** | Tạo tài khoản từ danh sách nhân sự | Tạo tài khoản người dùng dựa trên danh sách giáo viên/nhân viên đã khai báo. | `tenant-admin.account.create_from_staff` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **045** | Khóa/Mở tài khoản | Quản lý trạng thái sử dụng tài khoản. | `tenant-admin.account.lock_unlock` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **046** | Cấp lại mật khẩu | Thiết lập lại mật khẩu khi người dùng quên hoặc cần reset tài khoản. | `tenant-admin.account.reset_password` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **047** | Phân quyền chức năng | Gán vai trò Hiệu trưởng, Phó Hiệu trưởng, Tổ trưởng, Trưởng bộ phận, Giáo viên/Nhân viên... | `tenant-admin.role.assign_permission` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **048** | Phân quyền phạm vi dữ liệu | Xác định người dùng được xem dữ liệu toàn trường, một phân hiệu, một tổ chuyên môn hoặc một bộ phận. | `tenant-admin.account.assign_scope` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **049** | Danh mục KPI khác | Khai báo các KPI ngoài KPI công việc tự động tính. | `tenant-admin.kpi_definition.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **050** | Cấu hình KPI | Khai báo tên KPI, đơn vị tính, mức đạt/chỉ tiêu và đối tượng áp dụng. | `tenant-admin.kpi_definition.configure` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |
| **051** | Quản lý danh mục dùng chung | Quản lý các danh mục cơ bản như loại công việc, mức ưu tiên, trạng thái, loại minh chứng và đơn vị tính. | `tenant-admin.category.manage` | **MỞ RỘNG TỪ DEMO (M12/M13)** — bản demo có cấu hình cơ bản dạng đơn-tenant/cố định, Production phải chuyển thành cấu hình được theo từng tenant, xây ở Phase 2. |


5.4 Nhóm D – Hiệu trưởng (TT 52–77)
Tác nhân: Hiệu trưởng — vai trò có phạm vi rộng nhất trong tenant (dưới Tenant Admin), tập trung vào điều hành, giao việc, kiểm tra/phê duyệt và đánh giá toàn trường.
Dashboard toàn trường + phân tích theo phân hiệu, theo tổ/bộ phận, theo cá nhân (TT 52–55).
Cây kế hoạch hoạt động Năm học → Học kỳ → Tháng → Tuần → Công việc; thêm/cập nhật kế hoạch, xem công việc của từng kế hoạch (TT 56–59).
Tạo công việc (thuộc kế hoạch hoặc phát sinh), giao việc cho cá nhân hoặc cho cả tổ/bộ phận, thiết lập RACI đầy đủ (TT 60–63).
Danh sách công việc toàn trường, xem theo phân hiệu, xem theo tổ/bộ phận (TT 64–66).
Kiểm tra kết quả công việc; phê duyệt hoàn thành hoặc yêu cầu bổ sung kèm lý do (TT 67–69).
Đánh giá kết quả công việc theo 4 mức: Hoàn thành trước tiến độ / đúng tiến độ / chậm / Yêu cầu bổ sung-chưa đạt (TT 70).
KPI cá nhân, KPI toàn trường theo từng giáo viên/nhân viên, báo cáo KPI tuần/tháng, xuất Excel (TT 71–74).
Kho minh chứng toàn trường; báo cáo tổng hợp công việc theo kỳ/phân hiệu/tổ/cá nhân; duyệt các đề xuất công việc từ cấp dưới thuộc thẩm quyền (TT 75–77).
Tiêu chí nghiệm thu:
Hiệu trưởng mở Dashboard xác định được phân hiệu/tổ nào đang chậm nhất trong vòng ≤ 5 giây quan sát.
Giao được 1 công việc cho tổ chuyên môn với đầy đủ RACI trong ≤ 60 giây với người dùng lần đầu.
Từ danh sách công việc chờ duyệt, phê duyệt hoặc yêu cầu bổ sung 1 công việc trong tối đa 2 bước thao tác.

5.4.1 Bảng đặc tả chi tiết – Nhóm D (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 52–77)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **052** | Dashboard toàn trường | Tổng hợp tình hình công việc toàn trường: tổng số việc, chưa thực hiện, đang thực hiện, hoàn thành, sắp hết hạn và quá hạn. | `dashboard.school.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **053** | Phân tích theo phân hiệu | Xem tình hình công việc của điểm chính và từng phân hiệu. | `dashboard.school.by_location` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **054** | Phân tích theo tổ/bộ phận | Xem tình trạng công việc theo tổ chuyên môn và các bộ phận chức năng. | `dashboard.school.by_org_unit` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **055** | Phân tích theo cá nhân | Xem khối lượng và kết quả công việc của giáo viên/nhân viên. | `dashboard.school.by_individual` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **056** | Cây kế hoạch hoạt động | Xem cấu trúc Năm học → Học kỳ → Tháng → Tuần → Công việc. | `plan.tree.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **057** | Thêm kế hoạch | Tạo kế hoạch năm, học kỳ, tháng hoặc tuần; khai báo mục tiêu/nội dung chính, thời gian và phạm vi thực hiện. | `plan.create` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **058** | Cập nhật kế hoạch | Điều chỉnh nội dung, thời gian và các thông tin liên quan của kế hoạch. | `plan.update` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **059** | Xem công việc của kế hoạch | Xem toàn bộ các nhiệm vụ/công việc được tạo trong một kế hoạch. | `plan.view_tasks` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **060** | Tạo công việc | Tạo công việc thuộc kế hoạch hoặc công việc phát sinh ngoài kế hoạch. | `task.create` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **061** | Giao việc cho cá nhân | Giao trực tiếp cho Phó Hiệu trưởng, tổ trưởng, giáo viên hoặc nhân viên. | `task.assign_individual` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **062** | Giao việc cho tổ/bộ phận | Giao nhiệm vụ cho một tổ chuyên môn hoặc bộ phận như Y tế, Văn phòng, Thiết bị... | `task.assign_org_unit` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **063** | Thiết lập RACI | Xác định người thực hiện chính, người chịu trách nhiệm, người hỗ trợ/tham vấn và người được thông báo. | `task.raci.assign` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **064** | Danh sách công việc toàn trường | Xem và tìm kiếm tất cả công việc trong phạm vi nhà trường. | `task.view_school` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **065** | Xem công việc theo phân hiệu | Theo dõi riêng công việc của từng phân hiệu. | `task.view_by_location` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **066** | Xem công việc theo tổ/bộ phận | Theo dõi hoạt động của từng tổ chuyên môn hoặc bộ phận. | `task.view_by_org_unit` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **067** | Kiểm tra kết quả công việc | Xem tiến độ, kết quả, trao đổi và minh chứng của người thực hiện. | `task.review` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **068** | Phê duyệt hoàn thành | Xác nhận công việc đã hoàn thành và đạt yêu cầu. | `task.approve` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **069** | Yêu cầu bổ sung | Trả công việc về người thực hiện và ghi rõ nội dung cần bổ sung/chỉnh sửa. | `task.request_revision` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **070** | Đánh giá kết quả công việc | Đánh giá theo các mức: Hoàn thành trước tiến độ; Hoàn thành đúng tiến độ; Hoàn thành nhưng chậm; Yêu cầu bổ sung/Chưa đạt. | `task.evaluate` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **071** | KPI cá nhân | Xem các KPI của chính Hiệu trưởng và cập nhật các KPI không lấy tự động từ phần mềm. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **072** | KPI giáo viên/nhân viên | Xem KPI của từng cá nhân trong trường. | `kpi.view_staff` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **073** | Báo cáo KPI tuần/tháng | Tổng hợp KPI theo kỳ, cho phép lọc theo phân hiệu, tổ/bộ phận hoặc cá nhân. | `kpi.report_period` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **074** | Xuất KPI Excel | Xuất báo cáo KPI phục vụ tổng hợp, họp và lưu trữ. | `kpi.export_excel` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **075** | Kho minh chứng toàn trường | Xem và tìm kiếm minh chứng trong phạm vi toàn trường. | `evidence.view_school` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **076** | Báo cáo tổng hợp công việc | Xem tổng hợp thực hiện công việc theo kỳ, phân hiệu, tổ/bộ phận và cá nhân. | `report.task.summary` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **077** | Duyệt công việc đề xuất | Xem và quyết định chấp nhận/từ chối các công việc do cấp dưới đề xuất khi thuộc thẩm quyền. | `proposal.approve` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |


5.5 Nhóm E – Phó Hiệu trưởng (TT 78–93)
Tác nhân: Phó Hiệu trưởng. Về bản chất là tập con quyền của Hiệu trưởng, giới hạn theo phạm vi phân hiệu/lĩnh vực được Hiệu trưởng giao (cấu hình qua phân quyền phạm vi tại mục 5.3.4).
Dashboard theo phạm vi phụ trách; xem kế hoạch toàn trường (để nắm căn cứ điều hành) và kế hoạch riêng của phân hiệu; thêm/cập nhật kế hoạch trong phạm vi được phép (TT 78–81).
Nhận việc từ Hiệu trưởng, cập nhật công việc cá nhân trực tiếp thực hiện (TT 82–83).
Giao việc cho tổ/bộ phận và cho giáo viên/nhân viên trong phạm vi phụ trách; theo dõi toàn bộ công việc của phân hiệu (TT 84–86).
Kiểm tra, phê duyệt/yêu cầu bổ sung, đánh giá kết quả thực hiện của cấp dưới trong phạm vi (TT 87–89).
KPI cá nhân và KPI của nhân sự phụ trách; báo cáo công việc phân hiệu theo kỳ; xem minh chứng trong phạm vi quản lý (TT 90–93).
Tiêu chí nghiệm thu:
Phó Hiệu trưởng phụ trách phân hiệu A không nhìn thấy dữ liệu chi tiết (kế hoạch nội bộ, KPI cá nhân, minh chứng) của phân hiệu B trừ khi được Tenant Admin cấp thêm quyền.
Phê duyệt hoặc yêu cầu bổ sung một công việc trong phạm vi phụ trách hoạt động đúng như luồng workflow chung ở mục 5.1.2/9.4.

5.5.1 Bảng đặc tả chi tiết – Nhóm E (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 78–93)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **078** | Dashboard phân hiệu/phạm vi phụ trách | Xem tổng hợp công việc thuộc phân hiệu hoặc phạm vi được Hiệu trưởng giao quản lý. | `dashboard.scope.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **079** | Xem kế hoạch toàn trường | Được xem kế hoạch chung làm căn cứ điều hành tại phân hiệu. | `plan.view_school` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **080** | Xem kế hoạch phân hiệu | Xem các kế hoạch/công việc trực tiếp liên quan đến phân hiệu phụ trách. | `plan.view_location` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **081** | Thêm/cập nhật kế hoạch trong phạm vi được phép | Lập hoặc điều chỉnh kế hoạch thuộc phạm vi được Hiệu trưởng giao quyền. | `plan.manage_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **082** | Nhận công việc từ Hiệu trưởng | Theo dõi các nhiệm vụ được giao từ Hiệu trưởng. | `task.view_assigned_by_principal` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **083** | Cập nhật công việc cá nhân | Cập nhật tiến độ, kết quả và minh chứng của nhiệm vụ Phó Hiệu trưởng trực tiếp thực hiện. | `task.update_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **084** | Giao việc cho tổ/bộ phận | Phân rã nhiệm vụ và giao cho tổ chuyên môn/bộ phận thuộc phạm vi phụ trách. | `task.assign_org_unit_scoped` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **085** | Giao việc cho giáo viên/nhân viên | Giao trực tiếp công việc cho cá nhân trong phạm vi được quyền quản lý. | `task.assign_individual_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **086** | Theo dõi công việc phân hiệu | Xem toàn bộ công việc của phân hiệu phụ trách. | `task.view_location` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **087** | Kiểm tra công việc | Kiểm tra kết quả, tiến độ và minh chứng của cấp dưới. | `task.review_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **088** | Phê duyệt/Yêu cầu bổ sung | Phê duyệt công việc thuộc thẩm quyền hoặc yêu cầu người thực hiện bổ sung. | `task.approve_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **089** | Đánh giá kết quả thực hiện | Ghi nhận việc hoàn thành trước hạn, đúng hạn, hoàn thành chậm hoặc chưa đạt. | `task.evaluate_scoped` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **090** | KPI cá nhân | Xem và cập nhật KPI của bản thân. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **091** | Xem KPI nhân sự phụ trách | Theo dõi KPI của giáo viên/nhân viên thuộc phân hiệu/phạm vi quản lý. | `kpi.view_staff_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **092** | Báo cáo công việc phân hiệu | Tổng hợp tình hình công việc của phân hiệu theo tuần/tháng. | `report.location` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **093** | Minh chứng trong phạm vi quản lý | Xem và tìm kiếm các minh chứng của phân hiệu/phạm vi được phân công. | `evidence.view_scoped` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |


5.6 Nhóm F – Tổ trưởng / Trưởng bộ phận (TT 94–104)
Dashboard công việc được giao/thực hiện/hỗ trợ/kiểm tra; nhận việc từ cấp trên; xem công việc của cả tổ/bộ phận (TT 94–96).
Giao việc cho thành viên trong tổ/bộ phận, phân công RACI ở phạm vi tổ (TT 97–98).
Cập nhật công việc cá nhân trực tiếp thực hiện; theo dõi tiến độ các thành viên (chưa làm/đang làm/sắp hạn/quá hạn); kiểm tra kết quả thành viên trước khi trình cấp trên (TT 99–101).
Trao đổi/mention ngay trong công việc; KPI cá nhân; báo cáo công việc tổ/bộ phận theo kỳ (TT 102–104).
Tiêu chí nghiệm thu:
Tổ trưởng thấy được đầy đủ tiến độ của mọi thành viên trong tổ trên một màn hình duy nhất, phân biệt rõ theo màu trạng thái.

5.6.1 Bảng đặc tả chi tiết – Nhóm F (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 94–104)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **094** | Dashboard công việc | Hiển thị công việc mà tổ trưởng/trưởng bộ phận được giao, thực hiện, hỗ trợ hoặc kiểm tra. | `dashboard.team.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **095** | Nhận việc từ cấp trên | Nhận nhiệm vụ từ Hiệu trưởng hoặc Phó Hiệu trưởng. | `task.view_assigned_by_superior` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **096** | Xem công việc của tổ/bộ phận | Xem các công việc đang thực hiện bởi các thành viên trong tổ/bộ phận. | `task.view_team` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **097** | Giao việc cho thành viên | Phân công nhiệm vụ cho giáo viên/nhân viên thuộc tổ hoặc bộ phận. | `task.assign_team_member` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **098** | Phân công RACI | Chỉ định người thực hiện, người phối hợp/hỗ trợ và các bên cần được thông tin trong phạm vi công việc. | `task.raci.assign_team` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **099** | Cập nhật công việc cá nhân | Cập nhật tiến độ, kết quả và minh chứng với các nhiệm vụ tổ trưởng/trưởng bộ phận trực tiếp thực hiện. | `task.update_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **100** | Theo dõi tiến độ thành viên | Theo dõi việc chưa làm, đang làm, sắp hạn và quá hạn của các thành viên. | `task.track_team_progress` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **101** | Kiểm tra kết quả thành viên | Xem kết quả và minh chứng trước khi báo cáo hoặc trình cấp trên. | `task.review_team` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **102** | Trao đổi trong công việc | Trao đổi, hướng dẫn và mention thành viên ngay trên công việc. | `task.comment.create` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **103** | KPI cá nhân | Xem KPI tự động từ công việc và cập nhật các KPI khác theo cấu hình. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **104** | Báo cáo công việc tổ/bộ phận | Tổng hợp tình hình thực hiện công việc của tổ/bộ phận theo kỳ. | `report.team` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |


5.7 Nhóm G – Giáo viên / Nhân viên (TT 105–120)
Dashboard cá nhân: việc được giao, việc hỗ trợ/phối hợp/kiểm tra, sắp hạn, quá hạn (TT 105).
Nhận việc, xem chi tiết nhiệm vụ đầy đủ (yêu cầu, kết quả cần đạt, thời gian, người giao, người phối hợp, minh chứng yêu cầu) (TT 106–107).
Cập nhật tiến độ, báo cáo kết quả thực tế, cập nhật minh chứng (TT 108–110).
Gửi kiểm tra/phê duyệt sau khi hoàn thành; nhận yêu cầu bổ sung và cập nhật lại trước khi gửi lại (TT 111–112).
Đề xuất công việc phát sinh gửi cấp trên xem xét; trao đổi/mention với người liên quan (TT 113–114).
Dashboard KPI cá nhân: số việc được giao trong kỳ, tỷ lệ hoàn thành trước hạn/đúng hạn/chậm/chưa hoàn thành, tự động thống kê; cập nhật KPI khác theo danh mục Admin trường đã cấu hình (TT 115–120).
Tiêu chí nghiệm thu:
Giáo viên biết chính xác cần làm gì hôm nay ngay khi mở app, không cần tìm kiếm thêm.
Gửi hoàn thành 1 công việc chỉ khi đã đủ minh chứng bắt buộc (nếu người giao yêu cầu); nếu thiếu, hệ thống chặn và nêu rõ còn thiếu gì.

5.7.1 Bảng đặc tả chi tiết – Nhóm G (đầy đủ, nguyên văn Feature List v1.0.1, không bỏ sót dòng nào, TT 105–120)

| TT | Tên chức năng | Mô tả nghiệp vụ (nguyên văn Feature List v1.0.1) | Permission key đề xuất | Trạng thái Production |
|---|---|---|---|---|
| **105** | Dashboard cá nhân | Hiển thị tổng quan công việc được giao, công việc hỗ trợ, công việc cần phối hợp/kiểm tra, việc sắp hạn và quá hạn. | `dashboard.personal.view` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **106** | Nhận việc | Xem các nhiệm vụ được cấp trên giao. | `task.view_assigned` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **107** | Xem chi tiết nhiệm vụ | Xem yêu cầu, kết quả cần đạt, thời gian, người giao, người phối hợp và minh chứng yêu cầu. | `task.view_detail` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **108** | Cập nhật tiến độ | Cập nhật % hoàn thành và thông tin thực hiện. | `task.progress.update` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **109** | Báo cáo kết quả | Cập nhật nội dung kết quả thực tế sau khi thực hiện. | `task.result.update` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **110** | Cập nhật minh chứng | Tải tài liệu, ảnh hoặc đường dẫn để chứng minh kết quả công việc. | `evidence.upload` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **111** | Gửi kiểm tra/phê duyệt | Sau khi hoàn thành, chuyển công việc cho người có trách nhiệm kiểm tra/phê duyệt. | `task.submit_for_review` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **112** | Bổ sung theo yêu cầu | Nhận yêu cầu bổ sung và cập nhật lại công việc trước khi gửi kiểm tra lại. | `task.revise` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **113** | Đề xuất công việc | Tạo đề xuất một nhiệm vụ/công việc phát sinh và gửi cấp trên xem xét. | `proposal.create` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **114** | Trao đổi/mention | Trao đổi với người giao việc và thành viên liên quan trong từng công việc. | `task.comment.create` | **CẦN BỔ SUNG MỚI** — chưa có ở bản demo, phải phát triển thêm ở Phase 3. |
| **115** | Dashboard KPI cá nhân | Hiển thị số việc được giao trong kỳ, số việc đã hoàn thành, chưa hoàn thành và tình trạng tiến độ. | `kpi.dashboard_personal` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **116** | KPI hoàn thành trước hạn | Tự động thống kê số/tỷ lệ công việc hoàn thành trước thời hạn. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **117** | KPI hoàn thành đúng hạn | Tự động thống kê số/tỷ lệ công việc hoàn thành đúng thời hạn. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **118** | KPI hoàn thành chậm | Tự động thống kê số/tỷ lệ công việc đã hoàn thành nhưng quá thời hạn. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **119** | KPI chưa hoàn thành | Tự động thống kê số/tỷ lệ công việc chưa hoàn thành trong kỳ. | `kpi.view_own` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |
| **120** | Cập nhật KPI khác | Nhập kết quả của các KPI không thể tự động lấy từ công việc, theo danh mục Admin đã cấu hình. | `kpi.update_manual` | Kế thừa từ Demo — refactor thêm `tenant_id` + RLS + PermissionGuard, không viết lại logic đã đúng. |

5.8 Cơ chế tính KPI (chi tiết bổ sung)
KPI là mảng nghiệp vụ mới so với bản demo, xuất hiện xuyên suốt các vai trò (TT 49–50, 71–74, 90–91, 103, 115–120), cần một công thức và bộ máy tính toán nhất quán:
KPI tự động: hệ thống tự tính từ dữ liệu công việc đã hoàn thành trong kỳ, phân theo 4 nhóm — hoàn thành trước hạn, đúng hạn, chậm hạn, chưa hoàn thành — theo đúng dueDate và thời điểm chuyển trạng thái Hoàn thành/Đóng đã ghi trong TaskLog.
KPI thủ công (KPI khác): theo danh mục do Tenant Admin cấu hình (tên KPI, đơn vị tính, mức đạt/chỉ tiêu, đối tượng áp dụng), người dùng tự nhập kết quả theo kỳ, có thể đính kèm minh chứng.
Kỳ tính KPI: tuần/tháng/học kỳ/tùy chọn khoảng thời gian, tính lại (recompute) theo lịch định kỳ (job nền) và cho phép tính lại thủ công khi cần đối soát.
Phạm vi xem: cá nhân tự xem KPI của mình; Tổ trưởng xem KPI thành viên trong tổ; PHT xem KPI nhân sự phụ trách; Hiệu trưởng xem KPI toàn trường; tất cả xuất được ra Excel.
Tiêu chí nghiệm thu:
KPI hoàn thành-trước-hạn/đúng-hạn/chậm/chưa-hoàn-thành của một cá nhân trong kỳ khớp chính xác với dữ liệu Task/TaskLog gốc khi đối chiếu thủ công.

6. Mô hình dữ liệu (Data Model)
Mô hình dữ liệu mở rộng từ bản demo để hỗ trợ đa tenant và KPI. Trừ nhóm bảng thuộc lớp System Admin (Tenant, Package, TenantSubscription, SystemAuditLog), MỌI bảng còn lại bắt buộc có cột tenant_id và tuân thủ nguyên tắc cô lập tại mục 2.4.
Entity
Trường chính
Ghi chú
Tenant
id, code, name, status[active|suspended], createdAt
Không có tenant_id (chính nó định nghĩa tenant)
Package (Gói thuê)
id, name, maxAccounts, storageQuotaGB, enabledModules[]
Không có tenant_id — dùng chung toàn nền tảng
TenantSubscription
id, tenantId, packageId, startDate, endDate, status
Gán gói thuê + thời hạn cho từng tenant
SystemAuditLog
id, systemAdminId, action, targetTenantId, detail, createdAt
Nhật ký hành động System Admin
School (Trường)
id, tenantId, name, code, address, currentSchoolYear
1 tenant = 1 School (quan hệ 1-1 ở Production)
Location (Phân hiệu)
id, tenantId, schoolId, name, code, address, managerId
Điểm chính, Phân hiệu 1, 2…
OrgUnit (Tổ/Bộ phận)
id, tenantId, name, type, parentId
Tổ chuyên môn có thể phụ trách nhiều phân hiệu
ClassGroup (Lớp)
id, tenantId, name, grade, locationId, schoolYear
Phục vụ số liệu học sinh
StudentStat (Số liệu HS)
id, tenantId, classGroupId, totalStudents, maleCount, femaleCount, schoolYear
Số liệu tổng hợp, chưa quản lý hồ sơ từng học sinh
User (Nhân sự)
id, tenantId, fullName, phone, email, avatarUrl, position, passwordHash, status
phone/email unique toàn hệ thống để xác định tenant khi đăng nhập
Role
id, tenantId(nullable=system role), name, isCustom
6 vai trò chuẩn seed mặc định + custom role theo tenant
Permission (catalog)
id, key, groupName
Danh mục cố định toàn nền tảng, không có tenant_id
RolePermission
roleId, permissionId
Quan hệ N-N giữa Role và Permission
UserRole
userId, roleId, scopeLocationId, scopeOrgUnitId
Vai trò + phạm vi phụ trách
Plan (Kế hoạch)
id, tenantId, level, title, timeRange, content, expectedResult, parentPlanId, progressPercent
Cây kế hoạch nhiều cấp, tự tổng hợp tiến độ
Task (Công việc)
id, tenantId, planId(nullable), title, description, deliverable, priority, dueDate, locationId, status, progressPercent
status theo Workflow mục 6.1
TaskAssignment (RACI)
id, taskId, userId or orgUnitId, role[chu_tri|phoi_hop|kiem_tra|phe_duyet|theo_doi]
Hỗ trợ giao cho cá nhân hoặc cả tổ/bộ phận
TaskLog (Nhật ký)
id, taskId, userId, type, note, createdAt
Nguồn dữ liệu tính KPI tự động
Attachment (Minh chứng)
id, tenantId, taskId, fileName, fileUrl(theo tenant path), fileType, uploadedBy, uploadedAt
Kéo-thả hoặc chụp ảnh
KPIDefinition
id, tenantId, name, unit, target, appliesTo
Danh mục KPI khác do Tenant Admin cấu hình
KPIRecord
id, tenantId, userId, kpiDefinitionId(nullable=tự động), period, value, computedAt
Cả KPI tự động lẫn thủ công lưu chung bảng, phân biệt bằng kpiDefinitionId
Notification
id, tenantId, userId, type, title, message, relatedTaskId, isRead, createdAt
Sinh tự động theo sự kiện
Comment
id, tenantId, taskId, userId, content, mentions[], createdAt
@mention người liên quan
Category (Danh mục dùng chung)
id, tenantId, type, code, label
Loại công việc, mức ưu tiên, loại minh chứng…
AdminAuditLog
id, tenantId, actorUserId, action, targetType, targetId, detail, createdAt
Nhật ký hành động Tenant Admin
6.1 Chuỗi trạng thái công việc (Workflow status)
Chua_thuc_hien → Dang_thuc_hien → Cho_kiem_tra_phe_duyet → (Yeu_cau_bo_sung → quay lại Dang_thuc_hien) → Hoan_thanh; trạng thái phụ Qua_han tính tự động khi hiện tại > dueDate và chưa Hoàn thành; có thêm Tam_dung và Huy áp dụng theo quyền ở bất kỳ bước nào.

7. Kiến trúc kỹ thuật Production
7.1 Tổng quan kiến trúc
Lớp
Công nghệ đề xuất
Ghi chú Production
Frontend
Angular (bản mới nhất, standalone components) + Angular Material/Tailwind + Angular CDK
SPA đa tenant-aware: đọc theme/logo/tên hiển thị theo tenant sau đăng nhập; lazy-load theo module; giữ nguyên toàn bộ shared component từ demo (StatusBadge, PeoplePicker, ContactMiniCard, FileDropzone, PlanTree, StatusTabsCounter)
Backend
Node.js + NestJS (khuyến nghị nâng cấp từ Express để có DI, Guard, Interceptor chuẩn hoá tenant/role)
REST API module hoá theo domain; TenantGuard + RolesGuard + PermissionGuard áp dụng tập trung ở tầng framework, không rải rác trong từng controller
Cơ sở dữ liệu
PostgreSQL + Prisma (hoặc TypeORM) ORM
Shared schema + tenant_id + Row-Level Security theo mục 2.1/2.4; PgBouncer connection pooling
Cache & Session
Redis
Cache danh mục, permission matrix, dashboard aggregate; lưu refresh token blacklist; rate-limit counter theo tenant
Hàng đợi (Queue)
BullMQ (trên Redis)
Xử lý nền: gửi thông báo, tính KPI định kỳ, xuất Excel/báo cáo lớn, không chặn request chính
Lưu trữ file
S3-compatible object storage (MinIO tự triển khai hoặc AWS S3/DO Spaces)
Thay thế local disk của bản demo; path/key phân theo tenant (mục 2.4)
Realtime
Socket.io (namespace theo tenant)
Đẩy thông báo tức thời; fallback polling khi cần
Xác thực & phân quyền
JWT access + refresh token, RBAC (Role/Permission) + RLS
Access token thời hạn ngắn (~15 phút), refresh token dài hơn có rotate + revoke list trong Redis
7.2 Middleware đa tenant & bảo mật tầng API
TenantResolutionMiddleware: sau khi xác thực JWT, gắn tenantId vào request context; mọi service/repository đọc tenantId từ context, không đọc từ tham số client.
Mỗi request mở transaction sẽ SET LOCAL app.current_tenant = <tenantId> trước khi thực thi câu lệnh, kích hoạt policy RLS tương ứng.
PermissionGuard kiểm tra permission key cần thiết của từng endpoint dựa trên RolePermission đã cấu hình động theo tenant (không hard-code trong code danh sách quyền theo vai trò như bản demo).
System Admin API (/api/system-admin/*) tách route, middleware, và JWT scope hoàn toàn riêng biệt với API nghiệp vụ tenant (/api/*), không dùng chung guard.
7.3 Hiệu năng (Performance)
Đánh index composite theo mẫu truy vấn thực tế: (tenant_id, status, due_date), (tenant_id, org_unit_id), (tenant_id, location_id, status).
Cache Redis cho: danh mục dùng chung, permission matrix theo role, số liệu dashboard tổng hợp (invalidate khi có thay đổi liên quan hoặc TTL ngắn 30–60 giây).
Phân trang & lọc phía server bắt buộc cho mọi danh sách lớn (nhân sự, công việc); virtual scroll phía Angular cho danh sách hiển thị dài.
People Picker dùng debounce + tìm kiếm phía server có index (không tải toàn bộ danh sách nhân sự về client).
Tránh N+1 query: dùng include/join có kiểm soát trong Prisma/TypeORM, review query plan (EXPLAIN ANALYZE) cho các API dashboard/báo cáo trước khi go-live.
Tác vụ nặng (tính KPI toàn trường, xuất báo cáo lớn) đẩy qua BullMQ worker riêng, trả kết quả qua thông báo/khu vực tải xuống, không giữ request HTTP chờ lâu.
7.4 Khả năng mở rộng (Scalability)
Backend thiết kế stateless (JWT, không session in-memory) để nhân bản ngang (horizontal scale) nhiều instance sau load balancer/Nginx.
PgBouncer/connection pool giới hạn kết nối DB hiệu quả khi số instance backend tăng, tránh cạn kết nối PostgreSQL khi tải tới 5.000 tài khoản.
Tách worker xử lý queue (thông báo, KPI, export) khỏi tiến trình API chính để scale độc lập theo tải.
Khi một tenant tăng trưởng vượt trội (trường rất lớn), kiến trúc cho phép tách riêng sang schema/DB riêng mà không đổi tầng ứng dụng (nhờ tenant_id đã tách bạch từ đầu).
7.5 Quan sát hệ thống (Observability) & vận hành
Structured logging kèm correlationId + tenantId cho mọi request, tập trung log (ví dụ Loki/ELK).
Metrics (Prometheus/Grafana): số request/giây, p95 latency theo endpoint, số lỗi, tải theo tenant.
Error tracking (Sentry hoặc tương đương) bắt lỗi runtime frontend & backend kèm ngữ cảnh tenant.
Health check endpoint riêng cho load balancer; readiness/liveness probe nếu triển khai container hoá (Docker/Kubernetes).
CI/CD: pipeline build–test–migrate–deploy qua 3 môi trường Dev/Staging/Production; migration CSDL (Prisma Migrate) chạy có kiểm soát, không phá vỡ RLS policy hiện có.
Backup CSDL tự động hằng ngày + point-in-time recovery (7–30 ngày); diễn tập khôi phục định kỳ.
7.6 Cấu trúc thư mục đề xuất (cập nhật từ demo)
backend/src/modules/{auth, system-admin, tenants, packages, users, roles-permissions, orgunits, locations, classes, plans, tasks, attachments, kpi, notifications, reports}, backend/src/common/{guards, interceptors, decorators}, backend/prisma/schema.prisma — frontend/src/app/core/{auth, tenant-context}, frontend/src/app/shared/components/{peoplepicker, contact-card, file-dropzone, status-badge, plan-tree}, frontend/src/app/features/{system-admin, tenant-admin, dashboard, plans, tasks, kpi, org, notifications}.
7.7 Quy ước API (bổ sung so với demo)
Method & Path
Mô tả
POST /api/auth/login
Đăng nhập, xác định tenant từ tài khoản, trả JWT + vai trò/phạm vi
POST /api/system-admin/tenants
System Admin: tạo tenant mới (kèm khởi tạo Tenant Admin)
GET/PATCH /api/system-admin/tenants/:id
Xem/cập nhật/khoá-mở tenant
POST /api/system-admin/packages, /subscriptions
Quản lý gói thuê và gán gói cho tenant
GET /api/tenant-admin/school, /locations, /classes, /org-units
Cấu hình trường/phân hiệu/lớp/tổ chức (theo tenant hiện hành)
GET/POST /api/tenant-admin/users, /roles, /role-permissions
Quản lý tài khoản và ma trận phân quyền tùy biến theo tenant
GET/POST /api/plans, GET /api/plans/:id/tree
CRUD kế hoạch + cây kế hoạch nhiều cấp
GET/POST /api/tasks, PATCH /api/tasks/:id/status
CRUD công việc + chuyển trạng thái workflow
POST /api/tasks/:id/attachments (multipart)
Tải minh chứng, lưu theo path/tenant
GET /api/kpi/records, POST /api/kpi/recompute
Xem KPI theo phạm vi quyền; kích hoạt tính lại KPI
GET /api/dashboard/overview?locationId=&orgUnitId=
Số liệu tổng hợp Dashboard (có cache)
GET /api/notifications, PATCH /api/notifications/:id/read
Trung tâm thông báo
GET /api/reports/tasks, /reports/kpi (export=excel)
Báo cáo tổng hợp theo kỳ, xuất Excel

8. Yêu cầu phi chức năng
8.1 Hiệu năng (mục tiêu định lượng)
Chỉ tiêu
Mục tiêu
Thời gian phản hồi API danh sách có phân trang/index (p95)
< 300ms
Thời gian phản hồi Dashboard tổng hợp (có cache) (p95)
< 800ms
Tìm kiếm People Picker trên tập 1.000–5.000 người dùng
< 500ms
Số người dùng hoạt động đồng thời (giai đoạn đầu, ~1.000 TK)
≥ 300 phiên đồng thời không suy giảm hiệu năng
Số người dùng hoạt động đồng thời (mục tiêu mở rộng, ~5.000 TK)
≥ 1.000 phiên đồng thời, backend scale ngang thêm instance
Tải file minh chứng
Hiển thị tiến trình, không chặn thao tác khác trên trang
8.2 Bảo mật
HTTPS bắt buộc toàn hệ thống; CORS whitelist theo domain ứng dụng chính thức.
Mật khẩu băm bằng bcrypt/argon2; chính sách độ mạnh mật khẩu tối thiểu, khoá tạm tài khoản sau nhiều lần đăng nhập sai (chống brute-force).
JWT access token thời hạn ngắn, refresh token có cơ chế rotate + revoke; đăng xuất thu hồi refresh token ngay.
Phân quyền kiểm tra bắt buộc ở tầng API (RBAC + RLS 2 lớp theo mục 2.4/7.2), không tin bất kỳ thông tin quyền/tenant nào gửi từ client.
Kiểm tra và giới hạn loại/kích thước file khi tải minh chứng lên; quét virus/malware cho file tải lên ở môi trường Production.
Validate & sanitize toàn bộ input phía backend, chống SQL Injection (dùng ORM tham số hoá), XSS, CSRF cho các thao tác state-changing.
Audit log đầy đủ cho hành động nhạy cảm ở cả 2 lớp quản trị: System Admin (khoá tenant, đổi gói thuê...) và Tenant Admin (khoá tài khoản, đổi phân quyền, xoá phân hiệu...).
Tuân thủ các nguyên tắc bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP (Việt Nam) do hệ thống lưu trữ dữ liệu cá nhân của giáo viên/nhân viên và số liệu học sinh.
8.3 Sẵn sàng hệ thống & sao lưu (Availability & Backup)
Mục tiêu uptime 99.5% trong giờ hành chính các ngày làm việc.
Backup CSDL tự động hằng ngày, giữ point-in-time recovery tối thiểu 7 ngày (khuyến nghị 30 ngày cho gói cao cấp).
Diễn tập khôi phục (restore drill) định kỳ tối thiểu mỗi quý để đảm bảo quy trình DR thực sự hoạt động.
Thông báo bảo trì trước cho toàn bộ tenant khi có kế hoạch downtime, thực hiện ngoài giờ hành chính khi có thể.
8.4 UX/UI
Giữ nguyên toàn bộ nguyên tắc UX đã kiểm chứng ở bản demo: tiếng Việt đơn giản không thuật ngữ kỹ thuật, tối đa 3–4 bước cho thao tác chính, bảng màu trạng thái nhất quán, mobile-first (từ 360px), tap target tối thiểu 44x44px, trạng thái rỗng/lỗi/loading có thông điệp thân thiện.
Bổ sung khả năng white-label cơ bản theo tenant: mỗi trường có thể tùy chỉnh logo và tên hiển thị trên giao diện của mình mà không phá vỡ hệ thống thiết kế (design system) và bố cục chung.
Màn hình đăng nhập/label chung không hiển thị danh sách các trường khác — người dùng chỉ biết đến đúng trường của mình sau khi đăng nhập, tránh lộ thông tin thương mại giữa các khách hàng.
8.5 Khả năng bảo trì & mở rộng
Kiến trúc module hoá theo domain nghiệp vụ (không phải theo layer kỹ thuật thuần tuý) để dễ giao việc phát triển song song và bảo trì lâu dài.
Feature flag theo Package: bật/tắt module (ví dụ KPI nâng cao) theo gói thuê mà không cần deploy riêng cho từng tenant.
Permission Catalog và schema RLS được version hoá cùng migration, có tài liệu đi kèm mỗi lần thay đổi cấu trúc quyền.

9. Luồng nghiệp vụ chính
9.1 Luồng: Khởi tạo tenant mới (System Admin)
1. System Admin tạo tenant mới, nhập thông tin trường cơ bản.
2. Hệ thống sinh mã tenant, khởi tạo dữ liệu nền (6 vai trò chuẩn, danh mục mặc định) trong phạm vi tenant mới, cô lập ngay từ đầu.
3. System Admin gán gói thuê (hạn mức tài khoản, thời hạn) cho tenant.
4. System Admin khởi tạo tài khoản Tenant Admin đầu tiên, gửi thông tin đăng nhập cho trường.
5. Tenant Admin đăng nhập lần đầu bằng link chung của toàn hệ thống, hệ thống tự nhận đúng tenant và đưa vào giao diện cấu hình trường.
9.2 Luồng: Tenant Admin thiết lập trường lần đầu (onboarding)
1. Hoàn thiện thông tin nhà trường, khai báo phân hiệu.
2. Khai báo tổ chuyên môn/bộ phận và cơ cấu tổ chức.
3. Nhập/khai báo danh sách nhân sự, phân công phân hiệu và tổ/bộ phận cho từng người.
4. Tạo tài khoản từ danh sách nhân sự, phân quyền vai trò + phạm vi cho từng tài khoản (dùng bộ vai trò chuẩn hoặc tùy biến thêm).
5. Cấu hình danh mục dùng chung và danh mục KPI khác nếu cần.
6. Trường sẵn sàng đưa vào sử dụng: BGH bắt đầu lập kế hoạch và giao việc theo luồng 9.3/9.4.
9.3 Luồng: Từ kế hoạch tới công việc và tổng hợp tiến độ
1. PHT/Hiệu trưởng nhập/duyệt một dòng kế hoạch (thời gian – nội dung – kết quả cần đạt).
2. Từ dòng kế hoạch, tạo 1..n công việc con, gán RACI bằng People Picker (cho cá nhân hoặc cả tổ/bộ phận).
3. Người thực hiện cập nhật % tiến độ theo thời gian.
4. Hệ thống tự tính % hoàn thành của kế hoạch từ các công việc con.
5. Dashboard hiển thị ngay kế hoạch nào đang chậm so với mốc thời gian.
9.4 Luồng: Giao việc – Thực hiện – Kiểm tra – Phê duyệt
1. Người giao tạo công việc, gán RACI qua People Picker → Gửi giao việc.
2. Người thực hiện nhận thông báo, xác nhận nhận việc, trạng thái chuyển "Đang thực hiện".
3. Cập nhật tiến độ định kỳ, đính kèm minh chứng.
4. Gửi hoàn thành (hệ thống kiểm tra đủ minh chứng bắt buộc) → trạng thái "Chờ kiểm tra/phê duyệt".
5. Người kiểm tra/phê duyệt xác nhận đạt → "Hoàn thành", hoặc yêu cầu bổ sung → quay lại "Đang thực hiện" kèm lý do.
6. Ở mọi bước, hệ thống hiển thị rõ việc đang "tắc" ở ai để BGH theo dõi không cần hỏi qua điện thoại.
9.5 Luồng: Tính KPI tự động theo kỳ
1. Job nền (BullMQ) chạy định kỳ theo tenant, quét các Task đã Hoàn thành trong kỳ tính.
2. So sánh thời điểm hoàn thành với dueDate để phân loại: trước hạn / đúng hạn / chậm hạn.
3. Cộng thêm số việc chưa hoàn thành tính tới cuối kỳ.
4. Ghi kết quả vào KPIRecord theo từng người dùng, kèm thời điểm tính (computedAt) để đối soát.
5. Người dùng/Tổ trưởng/PHT/Hiệu trưởng xem theo đúng phạm vi quyền; có thể yêu cầu tính lại thủ công khi có điều chỉnh dữ liệu.

10. Kế hoạch nâng cấp lên Production (đề xuất)
Lộ trình đi từ mã nguồn bản demo (single-tenant) hiện có, ưu tiên xây nền tảng đa tenant trước khi mở rộng đầy đủ nghiệp vụ, để mọi module sau đó được phát triển trực tiếp trên nền multi-tenant, tránh phải refactor lại.
Giai đoạn
Nội dung
Đầu ra
Phase 1 – Nền tảng đa tenant
Thêm tenant_id vào toàn bộ bảng nghiệp vụ, bật RLS; TenantResolutionMiddleware; nâng cấp Auth để xác định tenant khi đăng nhập; module System Admin cơ bản (Tenant, Package)
Tạo được tenant mới, đăng nhập xác định đúng tenant, dữ liệu 2 tenant demo không lẫn nhau
Phase 2 – Admin trường & phân quyền động
Module Tenant Admin đầy đủ (trường, phân hiệu, lớp, tổ chức, nhân sự, tài khoản); Permission Catalog + RolePermission động thay ma trận cố định của demo
Tenant Admin tự cấu hình 1 trường từ đầu đến cuối, tùy biến được vai trò
Phase 3 – Nghiệp vụ lõi trên nền đa tenant
Chuyển toàn bộ M4–M10 của bản demo (kế hoạch, công việc RACI, minh chứng, workflow, thông báo, dashboard) sang chạy trên schema có tenant_id + RLS
Toàn bộ luồng 9.3/9.4 hoạt động đúng, cô lập theo tenant
Phase 4 – Module KPI
Xây KPIDefinition, KPIRecord, job tính KPI tự động (BullMQ), màn hình KPI theo từng vai trò
Luồng 9.5 chạy đúng, đối soát khớp dữ liệu Task gốc
Phase 5 – Hiệu năng & bảo mật hoá
Đánh index, cache Redis, chuyển file lên object storage theo tenant, rate-limit theo tenant, audit log đầy đủ, kiểm thử tải (load test) tới 5.000 tài khoản/nhiều tenant đồng thời
Đạt các chỉ tiêu mục 8.1, không phát hiện lỗ hổng rò rỉ dữ liệu chéo tenant
Phase 6 – UAT thí điểm & Go-live
Triển khai thí điểm 2–3 trường thật, thu thập phản hồi, chỉnh sửa UX, chuẩn bị vận hành chính thức (backup, monitoring, runbook)
Nghiệm thu theo chương 11, sẵn sàng bán/triển khai đại trà

11. Tiêu chí nghiệm thu bản Production
Tạo được ≥ 2 tenant độc lập từ giao diện System Admin, mỗi tenant có Tenant Admin riêng đăng nhập được bằng đúng một link chung của hệ thống.
Dữ liệu (kế hoạch, công việc, nhân sự, KPI, minh chứng, thông báo) của 2 tenant hoàn toàn tách biệt: không có API hay màn hình nào cho phép một tenant nhìn thấy dữ liệu của tenant khác.
Tenant Admin của mỗi trường tự hoàn thành onboarding (thông tin trường → phân hiệu → tổ chức → nhân sự → tài khoản → phân quyền → danh mục) mà không cần đội kỹ thuật can thiệp CSDL.
Hai tenant cấu hình được ma trận phân quyền khác nhau cho cùng một vai trò chuẩn, thể hiện đúng khi đăng nhập kiểm tra.
Toàn bộ 120 chức năng trong Feature List v1.0.1 hoạt động đúng đặc tả tại chương 5, kiểm thử qua ít nhất 6 vai trò (System Admin, Tenant Admin, Hiệu trưởng, PHT, Tổ trưởng, GV/NV).
Luồng kế hoạch → công việc → tiến độ → kiểm tra/phê duyệt → KPI chạy trọn vẹn end-to-end và số liệu KPI khớp với dữ liệu Task gốc khi đối soát thủ công.
Đạt các chỉ tiêu hiệu năng tại mục 8.1 khi kiểm thử tải mô phỏng 1.000 tài khoản (bắt buộc) và 5.000 tài khoản (mục tiêu mở rộng).
Vượt qua kiểm thử bảo mật cơ bản: không khai thác được lỗ hổng truy cập chéo tenant, không có endpoint nào bỏ qua PermissionGuard/RLS.
Toàn bộ giao diện hiển thị và thao tác bình thường trên khung hình rộng 375px (mô phỏng điện thoại phổ thông).
Có quy trình backup/restore được diễn tập thành công ít nhất 1 lần trước khi go-live chính thức.