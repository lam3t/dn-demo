TN EDU – SRS Demo (Angular + Node.js) 

# **TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM** 

**(SOFTWARE REQUIREMENTS SPECIFICATION – SRS)** 

_TN EDU – Hệ thống Quản lý Kế hoạch & Công việc Trường Phổ thông (Bản Demo cho mô hình trường liên cấp/nhiều điểm trường sau sáp nhập)_ 

Phiên bản: v0.1 – Bản dựng cho vibe-coding demo Công nghệ đề xuất: Frontend Angular · Backend Node.js (Express) · PostgreSQL Ngày lập: 09/09/2026 

_Căn cứ: Danh sách chức năng TN EDU v0.2; Biên bản họp 08/09/2026; Kế hoạch giáo dục Trường THCS Phước Tân năm học 2026-2027_ 

Trang 1 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **Mục lục** 

_(Mở file bằng Microsoft Word và nhấn Ctrl+A rồi F9, hoặc chuột phải chọn "Update Field", để mục lục tự hiển thị số trang theo các tiêu đề bên dưới.)_ 

Trang 2 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **1. Giới thiệu** 

## **1.1 Bối cảnh** 

Theo chủ trương sắp xếp lại đơn vị hành chính và mạng lưới trường học, nhiều trường phổ thông tại Việt Nam đang được sáp nhập thành "siêu trường" liên cấp/nhiều điểm trường, hoạt động tại nhiều địa điểm khác nhau nhưng dùng chung một Ban Giám hiệu, một kế hoạch giáo dục và một hệ thống quản trị. Ví dụ thực tế được dùng làm căn cứ xây dựng SRS này là Trường THCS Phước Tân (TP. Đồng Nai), được thành lập trên cơ sở sáp nhập 3 trường THCS Phước Tân 1, 2, 3, hiện có 122 lớp với 5.669 học sinh, hoạt động tại 3 điểm trường (Điểm chính, Phân hiệu 1, Phân hiệu 2). 

Sau sáp nhập, đội ngũ cán bộ quản lý, giáo viên, nhân viên tăng mạnh (thông thường 100–200 giáo viên/trường), số đầu mối phối hợp (điểm trường, tổ chuyên môn, cá nhân) tăng theo, trong khi cơ chế quản trị vẫn phải bảo đảm "một kế hoạch giáo dục, một quy chế chuyên môn, một tiến độ chương trình, một hệ thống dữ liệu dùng chung" (trích Kế hoạch giáo dục nhà trường 2026-2027). Điều này khiến khối lượng công việc điều hành của Ban Giám hiệu tăng vọt và rất khó kiểm soát nếu chỉ dùng các công cụ thủ công (văn bản giấy, Excel, Zalo, gọi điện). 

## **1.2 Mục đích tài liệu** 

Tài liệu này đặc tả yêu cầu phần mềm cho một ứng dụng DEMO nhằm chứng minh khả năng giải quyết 5 vấn đề vận hành lớn nhất mà Ban Giám hiệu gặp phải sau sáp nhập, làm cơ sở để đội phát triển (và các công cụ lập trình AI như Antigravity) dựng nhanh một bản dùng thử (proof of concept) trên nền Angular (frontend) và Node.js (backend). 

## **1.3 Phạm vi tài liệu** 

SRS tập trung vào phạm vi DEMO – tương đương một tập con ưu tiên cao của Giai đoạn 1 (GĐ1) trong "Danh sách chức năng TN EDU v0.2". Các phân hệ thuộc GĐ2 (KPI, đánh giá cá nhân, chuẩn nghề nghiệp) và GĐ3 (AI Copilot, tích hợp hệ thống ngoài, Data Warehouse/BI) được liệt kê ở mục 4.3 chỉ để tham chiếu lộ trình, KHÔNG nằm trong phạm vi xây dựng demo lần này. 

## **1.4 Đối tượng đọc tài liệu** 

Chủ đầu tư/Ban Giám hiệu trường (người duyệt yêu cầu), đội phát triển phần mềm, và công cụ lập trình AI (Antigravity) dùng tài liệu này cùng bộ prompt đi kèm để sinh mã nguồn ứng dụng demo. 

**1.5 Thuật ngữ và từ viết tắt** 

|**Thuật ngữ**|**Giải thích**|
|---|---|
|BGH|Ban Giám hiệu (Hiệu trưởng + các Phó Hiệu trưởng)|
|PHT|Phó Hiệu trưởng|
|Điểm trường|Cơ sở vật chất nơi diễn ra hoạt động dạy học (Điểm chính, Phân hiệu 1, Phân<br>hiệu 2...), không phải pháp nhân độc lập|
|PIC|Person In Charge – người chịu trách nhiệm chính của một công việc/hoạt động|
|RACI|Mô hình phân vai: Responsible (chủ trì), Accountable (phê duyệt), Consulted<br>(phối hợp), Informed (nhận thông báo)|
|Kế hoạch nhiều cấp|Chuỗi kế hoạch: Năm học → Học kỳ → Quý → Tháng → Tuần → Nhiệm<br>vụ/Công việc|



Trang 3 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

|**Thuật ngữ**|**Giải thích**|
|---|---|
|Minh chứng|Tài liệu/ảnh/biên bản chứng minh kết quả thực hiện công việc|
|Workfow|Chuỗi trạng thái xử lý công việc: Nháp → Đã giao → Đã tếp nhận → Đang thực<br>hiện → Chờ kiểm tra → Bổ sung → Hoàn thành → Xác nhận → Đóng|



Trang 4 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **2. Bối cảnh nghiệp vụ & vấn đề cần giải quyết (Problem Statement)** 

Đây là phần quan trọng nhất để định hướng UX: mọi màn hình, mọi luồng thao tác trong demo phải quay về giải quyết một trong 5 vấn đề dưới đây, được phát biểu trực tiếp bởi người dùng (Ban Giám hiệu). 

|**#**|**Vấn đề của Ban Giám hiệu sau sáp nhập**|**Yêu cầu UX/chức năng tương ứng**|
|---|---|---|
|1|Giao việc phải thuận tện, đơn giản dù số đầu<br>mối (GV/điểm trường) tăng lên nhiều|Form giao việc tối giản, People Picker tm-chọn<br>người phụ trách trong vài giây trên tập 100-200<br>GV, hỗ trợ giao nhanh từ mẫu có sẵn|
|2|Cần nắm nhanh tến độ từng nhiệm vụ/kế hoạch,<br>không phải hỏi từng người|Dashboard trực quan theo % hoàn thành, cây kế<br>hoạch cuộn lên/xuống tự tổng hợp tến độ từ việc<br>con|
|3|Cần biết ngay đầu mối phối hợp là ai và liên hệ<br>được luôn, không mở lại danh bạ điện thoại|Mỗi công việc/kế hoạch hiển thị thẻ liên hệ<br>(avatar, chức vụ, điểm trường, tổ) kèm nút gọi<br>điện/Zalo bấm-là-gọi|
|4|Cập nhật kết quả, minh chứng phải nhanh và<br>thuận tện nhất có thể|Khu vực kéo-thả (drag & drop) tệp minh chứng<br>ngay trên màn hình chi tết công việc, hỗ trợ cả<br>chụp ảnh từ điện thoại|
|5|Luồng phê duyệt phải trực quan: biết ngay việc<br>đang tắc/dừng ở ai, ở bước nào|Bảng/Kanban trạng thái theo màu (giống mẫu<br>tham chiếu: tab đếm số theo trạng thái + badge<br>màu), cho phép lọc "việc đang chờ tôi duyệt"|



## **2.1 Ràng buộc quy mô thực tế** 

- Một trường có thể có 2–4 điểm trường, 100–200 giáo viên/nhân viên, hàng chục tổ chuyên môn/tổ công tác. 

- Người dùng phần lớn KHÔNG rành công nghệ (giáo viên, nhân viên văn phòng) → ưu tiên tuyệt đối UX đơn giản, ít bước, chữ tiếng Việt rõ ràng, hạn chế thuật ngữ kỹ thuật. 

- Phần lớn thao tác cập nhật diễn ra trên điện thoại (giáo viên trong lớp/ở điểm trường xa) → giao diện phải responsive, tối ưu cho màn hình nhỏ, thao tác 1 tay. 

- Kế hoạch nhà trường tồn tại dưới dạng văn bản Word thực tế (xem mục 2.2), cần số hóa thành cấu trúc dữ liệu có thể theo dõi tiến độ, thay vì chỉ là file đính kèm tĩnh. 

## **2.2 Cấu trúc kế hoạch thực tế cần số hóa (trích từ Kế hoạch giáo dục Trường THCS Phước Tân 2026-2027)** 

File kế hoạch thực tế của nhà trường trình bày công việc theo bảng 3 cột: Thời gian (mốc/khoảng thời gian) – Nội dung trọng tâm (mô tả nhiệm vụ) – Kết quả cần đạt (tiêu chí hoàn thành). Đây chính là cấu trúc tối thiểu mà phân hệ Kế hoạch & Công việc trong phần mềm phải tái hiện được, đồng thời gắn thêm người phụ trách (PIC), người phối hợp, địa điểm thực hiện và trạng thái để có thể theo dõi được (bảng gốc chỉ là văn bản tĩnh, không theo dõi được ai đang làm, xong chưa). 

|**Thời gian**|**Nội dung trọng tâm (rút gọn)**|**Kết quả cần đạt (rút gọn)**|
|---|---|---|
|Tháng 8 – đầu tháng<br>9/2026|Ổn định tổ chức sau sáp nhập; rà soát đội<br>ngũ, cơ sở vật chất, phân công chuyên môn|Kế hoạch và phân công được phê<br>duyệt; hoạt động dạy học ổn định<br>tại 3 điểm trường|
|Trước 05/9/2026|Hoàn thiện và công khai Kế hoạch giáo dục<br>nhà trường|Kế hoạch được công khai đúng<br>thời hạn|
|Trước 15/9/2026|Gửi Kế hoạch giáo dục nhà trường về<br>UBND/Phòng GD phê duyệt|Hoàn thành thủ tục theo hướng<br>dẫn của Sở/Phòng|



Trang 5 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

|**Thời gian**|**Nội dung trọng tâm (rút gọn)**|**Kết quả cần đạt (rút gọn)**|
|---|---|---|
|Tháng 9/2026|Rà soát học sinh cần hỗ trợ; xây dựng kế<br>hoạch can thiệp|Danh sách hỗ trợ và kế hoạch can<br>thiệp được ban hành|



→ Ứng dụng demo phải cho phép: (a) nhập nhanh một kế hoạch theo đúng 3 cột này (hoặc import từ Excel/Word), (b) tự động sinh ra các công việc con gắn PIC/deadline, (c) tổng hợp % hoàn thành lên cấp kế hoạch cha. 

Trang 6 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **3. Người dùng & Vai trò (Actors)** 

Mô hình tổ chức tham chiếu theo Biên bản họp 08/09/2026: Hiệu trưởng → Phó Hiệu trưởng (phụ trách chung theo lĩnh vực hoặc phụ trách theo điểm trường) → Tổ trưởng chuyên môn → Giáo viên/Nhân viên. Hiệu trưởng và Phó Hiệu trưởng có thể tạo việc ngoài kế hoạch và gán trực tiếp cho giáo viên. 

|**Vai trò**|**Mô tả & phạm vi**|**Quyền chính trong demo**|
|---|---|---|
|Hiệu trưởng|Quản trị cao nhất, phân bổ mục têu<br>cho các PHT, phê duyệt cấp cuối|Xem toàn trường, tạo/giao kế<br>hoạch & việc, phê duyệt cấp cao,<br>xem mọi dashboard|
|Phó Hiệu trưởng (phụ trách<br>lĩnh vực hoặc điểm trường)|Nhận mục têu từ Hiệu trưởng, phân<br>công cho tổ chuyên môn/điểm trường<br>phụ trách, tổng hợp báo lên Hiệu<br>trưởng|Giao việc, gán PIC theo tổ/điểm<br>trường, phê duyệt cấp 1, xem<br>dashboard theo phạm vi phụ<br>trách|
|Tổ trưởng chuyên môn / Tổ<br>trưởng văn phòng|Nhận việc từ PHT, phân bổ cho thành<br>viên tổ (có thể phụ trách xuyên suốt 3<br>điểm trường vì sinh hoạt tổ chuyên<br>môn dùng chung)|Giao việc trong tổ, kiểm tra kết<br>quả trước khi trình PHT, xem tến<br>độ tổ|
|Giáo viên / Nhân viên|Người thực hiện trực tếp, có thể<br>dạy/làm việc tại nhiều điểm trường|Nhận việc, cập nhật tến độ, đính<br>kèm minh chứng, xem "Việc của<br>tôi", liên hệ đầu mối phối hợp|
|Quản trị hệ thống (Admin)|Cấu hình danh mục, tài khoản, cơ cấu<br>tổ chức, điểm trường (không phải<br>người dùng nghiệp vụ hằng ngày)|Cấu hình toàn hệ thống trong<br>phạm vi demo|



Trang 7 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **4. Phạm vi chức năng của bản Demo** 

## **4.1 Nguyên tắc chọn phạm vi** 

Từ 30 nhóm chức năng trong "Danh sách chức năng TN EDU v0.2" (GĐ1: nhóm 1-19, GĐ2: nhóm 20-25 KPI/đánh giá, GĐ3: nhóm 26-30 AI/tích hợp/BI), bản demo chỉ lấy các chức năng GĐ1 trực tiếp phục vụ 5 vấn đề ở mục 2, đủ để trình diễn một vòng nghiệp vụ đầy đủ: Lập kế hoạch → Giao việc → Thực hiện & cập nhật minh chứng → Kiểm tra & phê duyệt → Theo dõi qua Dashboard. 

## **4.2 Danh sách module trong phạm vi Demo** 

|**Mã**|**Module trong Demo**|**Chức năng gốc tham chiếu (feature**<br>**list v0.2)**|**Giải quyết vấn**<br>**đề #**|
|---|---|---|---|
|M1|Đăng nhập & Hồ sơ cá nhân (rút gọn)|1.1, 1.2, 1.5, 1.6|Nền tảng|
|M2|Cơ cấu tổ chức & Điểm trường|3.1, 4.1–4.3, 5.1–5.4, 5.8|3|
|M3|Danh bạ nhân sự & People Picker<br>nhanh|6.1, 6.5, 6.7, 6.10|1, 3|
|M4|Kế hoạch nhiều cấp<br>(Năm→Kỳ→Quý→Tháng→Tuần)|9.1–9.11, 9.15|2|
|M5|Công việc & Giao việc (RACI)|10.1–10.10, 10.16–10.18|1, 2|
|M6|Nhật ký, cập nhật tến độ & Minh<br>chứng kéo-thả|10.11–10.13, 14.1–14.6|2, 4|
|M7|Workfow kiểm tra – phê duyệt trực<br>quan|11.1–11.7, 11.11|5|
|M8|Liên hệ nhanh đầu mối (click-to-call)|6.1, 6.5 (mở rộng UX)|3|
|M9|Thông báo (trong app)|15.1–15.6, 15.10|1, 2, 5|
|M10|Dashboard điều hành & Việc của tôi|16.1–16.3, 16.6, 16.10, 16.12, 16.13|2, 5|
|M11|Phân quyền cơ bản theo vai trò &<br>phạm vi|18.1–18.6 (rút gọn)|Nền tảng|
|M12|Cấu hình hệ thống: Tài khoản,<br>Phân quyền & Điểm trường (gồm<br>Giáo viên theo điểm trường)|3.1, 18.1–18.6 (mở rộng UI quản<br>trị)|Nền tảng|



## **4.3 Ngoài phạm vi Demo (Out of scope – chỉ tham khảo lộ trình)** 

- Nhóm 20–25 (GĐ2): Cấu hình bộ KPI, tính điểm KPI, đánh giá cá nhân/xếp loại, đánh giá chuẩn nghề nghiệp GV/HT. 

- Nhóm 26–28 (GĐ3): AI Copilot điều hành, AI xử lý văn bản/OCR, AI phân tích rủi ro. 

- Nhóm 29 (GĐ3): SSO, Zalo OA, chữ ký số, tích hợp CSDL ngành, LMS, lịch Google/Microsoft, webhook, API bên thứ ba. 

- Nhóm 30 (GĐ3): Data Warehouse, BI, tìm kiếm toàn văn nâng cao, archive/retention, giám sát vận hành nâng cao. 

- Đa tenant thật (multi-school) — demo có thể giả lập 1 tenant duy nhất (một trường) để đơn giản hoá. 

Trang 8 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **5. Yêu cầu chức năng chi tiết** 

## **5.1 M1 – Đăng nhập & Hồ sơ cá nhân** 

### **5.1.1 Đăng nhập hệ thống** 

Tác nhân: Tất cả người dùng 

Người dùng đăng nhập bằng số điện thoại/email và mật khẩu (demo dùng tài khoản dựng sẵn, không cần OTP thật). 

#### **Các bước chính:** 

1. Người dùng nhập số điện thoại/email + mật khẩu. 

2. Hệ thống xác thực và trả về vai trò hiện hành + danh sách điểm trường được phép truy cập. 

3. Nếu người dùng có nhiều vai trò/điểm trường phụ trách, hiển thị màn hình chọn ngữ cảnh làm việc trước khi vào Dashboard. 

#### **Lưu ý UX:** 

- Form đăng nhập tối đa 2 trường nhập liệu, nút bấm lớn, dễ bấm trên điện thoại. 

- Ghi nhớ đăng nhập theo thiết bị để giáo viên không phải đăng nhập lại nhiều lần. 

#### **Tiêu chí chấp nhận:** 

- Đăng nhập thành công chuyển thẳng vào Dashboard cá nhân trong ≤ 2 bước thao tác. 

## **5.2 M2 – Cơ cấu tổ chức & Điểm trường** 

### **5.2.1 Quản lý điểm trường và cơ cấu tổ chức** 

Tác nhân: Admin, Hiệu trưởng 

Khai báo trường, các điểm trường (Điểm chính, Phân hiệu 1, Phân hiệu 2…), Ban Giám hiệu, tổ chuyên môn/tổ văn phòng, và quan hệ cha-con giữa các đơn vị để làm nền cho việc gán người phụ trách và lọc dữ liệu. 

#### **Các bước chính:** 

1. Tạo/sửa điểm trường: mã, tên, địa chỉ, người phụ trách (PHT phụ trách điểm trường). 

2. Tạo tổ chuyên môn/tổ văn phòng, gán tổ trưởng/tổ phó/thành viên (lưu ý: một tổ chuyên môn có thể phụ trách chung cho cả 3 điểm trường). 

3. Xem sơ đồ tổ chức dạng cây: Hiệu trưởng → PHT → Tổ → Thành viên, có thể lọc theo điểm trường. 

#### **Lưu ý UX:** 

- Sơ đồ tổ chức hiển thị trực quan dạng cây có thể thu gọn/mở rộng, dùng được trên mobile (cuộn ngang). 

- Gắn nhãn màu cho từng điểm trường để nhận diện nhanh trong toàn hệ thống. 

#### **Tiêu chí chấp nhận:** 

- Từ một điểm trường có thể xem ngay danh sách nhân sự và công việc đang triển khai tại đó. 

## **5.3 M3 – Danh bạ nhân sự & People Picker nhanh (100–200 GV)** 

### **5.3.1 Tìm và chọn người phụ trách nhanh** 

Tác nhân: PHT, Tổ trưởng, Hiệu trưởng 

Trang 9 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

Đây là chức năng UX then chốt: khi giao việc, người giao phải tìm và chọn đúng người trong danh sách 100200 giáo viên chỉ trong vài giây. 

#### **Các bước chính:** 

1. Người dùng gõ tên/mở bộ lọc (theo tổ chuyên môn, điểm trường, chức vụ, môn dạy). 

2. Danh sách gợi ý hiện ngay theo thời gian thực (search-as-you-type), có avatar, chức vụ, điểm trường, số việc đang xử lý (tải công việc hiện tại). 

3. Người dùng chọn 1 người chủ trì + có thể chọn thêm nhiều người phối hợp bằng chip/tag. 

4. Hệ thống lưu "người hay giao việc cùng" / "gần đây" để gợi ý ưu tiên lên đầu danh sách. 

#### **Lưu ý UX:** 

- Component dạng combobox/autocomplete với avatar + badge tải việc (ví dụ chấm màu xanh/vàng/đỏ theo số việc đang xử lý) để tránh giao việc cho người đã quá tải. 

- Trên mobile: modal full-screen với ô tìm kiếm ở trên cùng, danh sách lớn dễ bấm bằng ngón tay. 

- Bàn phím ảo tiếng Việt có dấu phải tìm đúng theo tên không dấu lẫn có dấu. 

#### **Tiêu chí chấp nhận:** 

- Chọn được người phụ trách trong ≤ 5 giây thao tác kể từ khi mở form giao việc, với danh sách mẫu ≥ 150 giáo viên. 

## **5.4 M4 – Kế hoạch nhiều cấp** 

### **5.4.1 Lập & số hóa kế hoạch (Năm học → Học kỳ → Quý → Tháng → Tuần)** 

Tác nhân: Hiệu trưởng, PHT 

Số hóa cấu trúc kế hoạch thực tế của nhà trường (Thời gian – Nội dung – Kết quả cần đạt) thành cây kế hoạch có thể gán người phụ trách và theo dõi % hoàn thành tự động. 

#### **Các bước chính:** 

1. Tạo kế hoạch năm học với các mốc/nội dung/kết quả cần đạt (nhập tay theo dòng, hoặc import từ Excel/Word theo mẫu 3 cột). 

2. Từ một dòng kế hoạch, tạo nhanh một hoặc nhiều Công việc con, kế thừa thời gian và mô tả, chỉ cần bổ sung người phụ trách. 

3. Hệ thống tự tổng hợp % hoàn thành của kế hoạch từ các công việc con (trung bình hoặc theo trọng số). 

4. Hiển thị kế hoạch dạng cây thu gọn được theo cấp: Năm → Kỳ → Quý → Tháng → Tuần → Việc. 

#### **Lưu ý UX:** 

- Màn hình nhập kế hoạch giống hệt bố cục bảng 3 cột quen thuộc của giáo viên (Thời gian / Nội dung / Kết quả cần đạt) để không gây bỡ ngỡ. 

- Cho phép sao chép kế hoạch kỳ trước làm khung, chỉ chỉnh sửa phần khác biệt. 

#### **Tiêu chí chấp nhận:** 

- Từ 1 kế hoạch năm, có thể vào tới danh sách công việc chi tiết chỉ trong tối đa 3 lần bấm. 

## **5.5 M5 – Công việc & Giao việc (RACI)** 

### **5.5.1 Tạo và giao việc** 

Tác nhân: Hiệu trưởng, PHT, Tổ trưởng 

Trang 10 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

Tạo công việc (có thể gắn vào một dòng kế hoạch hoặc tạo độc lập/đột xuất), chỉ định người chủ trì, người phối hợp, người kiểm tra, người phê duyệt và người chỉ nhận thông báo — đúng mô hình RACI đã thống nhất trong họp 08/09/2026. 

#### **Các bước chính:** 

1. Nhập tên việc, mô tả, kết quả/sản phẩm cần nộp, hạn hoàn thành, mức ưu tiên, địa điểm thực hiện. 

2. Dùng People Picker (mục 5.3) để gán: 1 người chủ trì (bắt buộc), n người phối hợp, người kiểm tra, người phê duyệt. 

3. Gửi giao việc → hệ thống tạo thông báo cho tất cả người liên quan. 

4. Người được giao xác nhận đã nhận việc (hoặc yêu cầu làm rõ nếu mô tả chưa rõ). 

#### **Lưu ý UX:** 

- Form giao việc theo từng bước (wizard 3 bước: Thông tin việc → Chọn người → Xác nhận) để giảm cảm giác phức tạp cho người ít rành công nghệ. 

- Cung cấp việc từ mẫu có sẵn (checklist họp giao ban, kiểm tra CSVC…) để giảm thao tác nhập lại. 

#### **Tiêu chí chấp nhận:** 

- Tạo và giao xong một công việc trong ≤ 60 giây với người dùng lần đầu sử dụng. 

## **5.6 M6 – Cập nhật tiến độ, nhật ký & Minh chứng kéo-thả** 

### **5.6.1 Cập nhật kết quả và đính kèm minh chứng** 

Tác nhân: Người chủ trì/phối hợp 

Người thực hiện cập nhật % tiến độ, ghi chú, và đính kèm minh chứng (file/ảnh) theo cách thuận tiện nhất — kéo-thả trên máy tính, chụp ảnh/chọn ảnh trên điện thoại. 

#### **Các bước chính:** 

1. Mở chi tiết công việc, kéo-thả file (hoặc bấm vùng "Thả file vào đây / Chọn file") vào khung minh chứng. 

2. Trên điện thoại: khu vực đính kèm hiển thị 2 nút lớn "Chụp ảnh" và "Chọn từ thư viện". 

3. Cập nhật thanh trượt % tiến độ và nhập ghi chú ngắn về việc đã làm. 

4. Nếu người giao yêu cầu minh chứng bắt buộc, hệ thống chặn nút "Gửi hoàn thành" cho tới khi đủ minh chứng. 

5. Ghi nhật ký (timeline) mọi mốc cập nhật để BGH xem lại quá trình xử lý. 

#### **Lưu ý UX:** 

- Vùng kéo-thả chiếm diện tích lớn, có phản hồi trực quan khi rê file vào (đổi màu viền). 

- Xem trước (thumbnail) ảnh/PDF ngay sau khi tải lên, không cần mở file. 

- Thanh tiến độ dùng màu (đỏ/vàng/xanh) phản ánh nhanh tình trạng so với hạn. 

#### **Tiêu chí chấp nhận:** 

- Đính kèm 1 file minh chứng và cập nhật % tiến độ trong ≤ 3 thao tác chạm trên điện thoại. 

## **5.7 M7 – Workflow kiểm tra – phê duyệt trực quan** 

### **5.7.1 Theo dõi và xử lý luồng phê duyệt** 

Tác nhân: Người kiểm tra, người phê duyệt, BGH 

Trang 11 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

Toàn bộ công việc đi qua chuỗi trạng thái chuẩn: Nháp → Đã giao → Đã tiếp nhận → Đang thực hiện → Chờ kiểm tra → (Bổ sung nếu bị trả lại) → Hoàn thành → Xác nhận → Đóng. Màn hình phải cho biết ngay việc đang "tắc" ở người nào/bước nào. 

#### **Các bước chính:** 

1. Người thực hiện gửi kết quả → trạng thái chuyển "Chờ kiểm tra", việc xuất hiện trong danh sách chờ xử lý của người kiểm tra. 

2. Người kiểm tra xem tiến độ/minh chứng, chọn Xác nhận đạt hoặc Yêu cầu bổ sung (kèm lý do, hạn bổ sung). 

3. Nếu đạt, việc chuyển tiếp lên người phê duyệt (nếu có cấu hình cấp phê duyệt); nếu không, việc quay lại người thực hiện ở trạng thái "Bổ sung". 

4. Sau khi phê duyệt, việc chuyển "Hoàn thành" → "Đóng". 

#### **Lưu ý UX:** 

- Trình bày dạng bảng/kanban theo tab trạng thái có đếm số lượng và màu riêng (tham khảo mẫu giao diện đính kèm: tab Mới/Đang thực hiện/Chờ phê duyệt/Phê duyệt/Đóng với số đếm và badge màu). 

- Mỗi việc đang ở trạng thái chờ hiển thị rõ TÊN và AVATAR người đang giữ việc (đang "tắc" ở ai), kèm số ngày đã chờ. 

- Cho phép người dùng bấm trực tiếp vào avatar để gọi điện/nhắn hỏi người đang giữ việc (liên kết với M8). 

#### **Tiêu chí chấp nhận:** 

- Từ Dashboard, BGH xác định được ngay việc nào đang tắc, tắc ở ai, tắc bao lâu chỉ trong 1 màn hình, không cần hỏi qua điện thoại. 

## **5.8 M8 – Liên hệ nhanh đầu mối (Click-to-call)** 

### **5.8.1 Gọi/nhắn cho đầu mối phối hợp ngay trong công việc** 

Tác nhân: Tất cả người dùng 

Ở bất kỳ đâu hệ thống hiển thị tên một người liên quan tới công việc (chủ trì, phối hợp, kiểm tra, phê duyệt), thông tin liên hệ phải đi kèm để bấm gọi ngay, không cần mở danh bạ điện thoại riêng. 

#### **Các bước chính:** 

1. Hiển thị thẻ mini (mini-card) khi bấm/chạm vào tên hoặc avatar: ảnh đại diện, chức vụ, tổ, điểm trường, số điện thoại. 

2. Nút "Gọi điện" gọi trực tiếp qua liên kết tel: (trên mobile mở app điện thoại ngay); có thể có nút Zalo (liên kết ngoài) ở bản demo dạng mock. 

#### **Lưu ý UX:** 

- Không bắt người dùng phải rời màn hình hiện tại để tra số điện thoại; mini-card hiện dạng popover/bottom-sheet. 

#### **Tiêu chí chấp nhận:** 

- Từ màn hình chi tiết công việc, gọi được cho người chủ trì/phối hợp trong đúng 2 lần chạm. 

## **5.9 M9 – Thông báo** 

### **5.9.1 Trung tâm thông báo trong ứng dụng** 

Tác nhân: Tất cả người dùng 

Trang 12 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

Thông báo các sự kiện quan trọng: được giao việc mới, sắp đến hạn, quá hạn, bị yêu cầu bổ sung, kết quả phê duyệt. 

#### **Các bước chính:** 

1. Sinh thông báo tự động khi: giao việc mới, đổi hạn/người phụ trách, còn X ngày tới hạn, quá hạn, việc bị trả lại, có kết quả duyệt. 

2. Hiển thị số lượng chưa đọc trên icon chuông; danh sách thông báo có thể lọc theo loại, bấm vào để đi thẳng tới công việc liên quan. 

#### **Lưu ý UX:** 

- Thông báo hiển thị ngay trong ứng dụng, không bắt buộc tích hợp email/Zalo thật ở bản demo (để ở dạng mô phỏng/log). 

#### **Tiêu chí chấp nhận:** 

- 100% các thay đổi trạng thái quan trọng đều sinh ra thông báo, kiểm chứng được trong Trung tâm thông báo. 

## **5.10 M10 – Dashboard điều hành & "Việc của tôi"** 

### **5.10.1 Dashboard tổng quan cho BGH** 

Tác nhân: Hiệu trưởng, PHT 

Một màn hình duy nhất trả lời nhanh 3 câu hỏi: việc nào đang trễ, đang tắc ở đâu/ai, và tiến độ tổng thể theo điểm trường/tổ. 

#### **Các bước chính:** 

1. Hiển thị số liệu tổng: tổng việc, chưa làm, đang làm, hoàn thành, quá hạn, rủi ro. 

2. Biểu đồ so sánh tiến độ theo điểm trường và theo tổ chuyên môn. 

3. Danh sách "Việc cần quan tâm": quá hạn, sắp hạn, bị trả lại, chờ quyết định — bấm để xem chi tiết (drill-down). 

#### **Lưu ý UX:** 

- Dùng biểu đồ đơn giản (thanh ngang, số lớn) thay vì biểu đồ phức tạp khó đọc trên điện thoại. 

#### **Tiêu chí chấp nhận:** 

- Hiệu trưởng mở Dashboard và xác định được điểm trường/tổ nào đang chậm nhất trong vòng ≤ 5 giây quan sát. 

### **5.10.2 "Việc của tôi" cho giáo viên/nhân viên** 

Tác nhân: Giáo viên, Nhân viên, Tổ trưởng 

Màn hình cá nhân hóa: việc hôm nay, tuần này, sắp hạn, quá hạn, chờ tôi kiểm tra/xác nhận — là màn hình mặc định sau đăng nhập. 

#### **Các bước chính:** 

1. Nhóm việc theo: Hôm nay / Tuần này / Sắp hạn / Quá hạn / Chờ xác nhận. 

2. Mỗi thẻ việc hiện đủ: tên việc, hạn, trạng thái màu, nút cập nhật nhanh. 

#### **Lưu ý UX:** 

- Ưu tiên hiển thị việc quan trọng/gấp nhất lên đầu danh sách. 

#### **Tiêu chí chấp nhận:** 

- Giáo viên biết chính xác cần làm gì hôm nay ngay khi mở app, không cần tìm kiếm thêm. 

Trang 13 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

## **5.11 M11 – Phân quyền cơ bản theo vai trò & phạm vi** 

### **5.11.1 Kiểm soát quyền truy cập theo vai trò và điểm trường** 

Tác nhân: Admin, hệ thống 

Bảo đảm PHT phụ trách điểm trường A không thấy dữ liệu nhạy cảm của điểm trường B (trừ Hiệu trưởng thấy toàn trường); giáo viên chỉ thấy việc mình liên quan. 

#### **Các bước chính:** 

1. Gán vai trò (Hiệu trưởng/PHT/Tổ trưởng/GV/NV/Admin) và phạm vi (điểm trường, tổ) cho từng tài khoản. 

2. Mọi API kiểm tra vai trò + phạm vi trước khi trả dữ liệu (không lọc phía client). 

#### **Lưu ý UX:** 

- Ở bản demo, dùng ma trận quyền tối giản (role-based), chưa cần workflow ủy quyền phức tạp của GĐ1 đầy đủ. 

#### **Tiêu chí chấp nhận:** 

- Đăng nhập bằng tài khoản GV chỉ thấy việc của mình + việc mình phối hợp/kiểm tra, không thấy việc của điểm trường khác. 

Trang 14 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

## **5.12 M12 – Cấu hình hệ thống: Tài khoản, Phân quyền & Điểm trường** 

### **5.12.1 Quản lý tài khoản và phân quyền** 

Tác nhân: Admin, Hiệu trưởng 

Hiện tại hệ thống mới chỉ enforce phân quyền ở tầng API (M11) nhưng chưa có màn hình cho Admin/Hiệu trưởng tự tạo tài khoản mới, khoá tài khoản nghỉ việc, hay gán/đổi vai trò và phạm vi phụ trách khi có biến động nhân sự. Mục này bổ sung màn hình "Cấu hình hệ thống" để quản trị các việc đó mà không cần can thiệp trực tiếp vào cơ sở dữ liệu. 

Các bước chính: 

1. Admin/Hiệu trưởng vào "Cấu hình hệ thống" → tab "Tài khoản": tìm, lọc theo điểm trường/tổ/vai trò/trạng thái, tạo tài khoản mới, sửa thông tin, khoá/mở khoá, đặt lại mật khẩu về mặc định. 

2. Chuyển sang tab "Phân quyền": chọn 1 tài khoản, xem các vai trò + phạm vi hiện có dạng chip, thêm hoặc gỡ vai trò/phạm vi cho tài khoản đó (mỗi tài khoản luôn còn ít nhất 1 vai trò). 

3. Xem "Bảng quyền tham khảo" liệt kê mỗi vai trò được phép làm gì trong phạm vi demo, phục vụ tra cứu khi phân vai trò cho người mới. 

Lưu ý UX: 

Mọi hành động khoá tài khoản, gỡ vai trò, xoá điểm trường đều có hộp xác nhận nêu rõ hậu quả bằng tiếng Việt đơn giản. 

Phân quyền ở bản demo dùng ma trận cố định theo vai trò (đã có ở M11); màn hình này chỉ quản lý việc GÁN vai trò cho từng tài khoản, chưa hỗ trợ tuỳ biến chi tiết từng quyền. 

Tiêu chí chấp nhận: 

Admin tạo được 1 tài khoản mới, gán đúng vai trò + phạm vi, và tài khoản đó đăng nhập được ngay với đúng quyền hạn tương ứng. 

Khoá 1 tài khoản thì tài khoản đó không đăng nhập được nữa; mở khoá lại thì đăng nhập được bình thường. 

### **5.12.2 Sửa và quản lý Điểm trường** 

Tác nhân: Admin, Hiệu trưởng 

Bổ sung thao tác tạo/sửa/xoá điểm trường ngay trên giao diện (API đã có ở M2/Prompt 4 nhưng trước đây chưa có màn hình sử dụng cho việc sửa hay xoá, chỉ dùng để xem cây tổ chức). 

Các bước chính: 

1. Tab "Điểm trường" trong "Cấu hình hệ thống" hiện danh sách điểm trường dạng thẻ kèm số nhân sự, số công việc đang triển khai, số công việc quá hạn. 

2. Bấm "+ Thêm điểm trường" hoặc "Sửa" trên 1 thẻ để mở form: tên, mã, địa chỉ, người phụ trách (chọn qua People Picker). 

3. Chỉ cho phép xoá điểm trường khi không còn nhân sự và không còn công việc nào gắn với điểm trường đó; ngược lại hệ thống báo rõ lý do không xoá được. 

Tiêu chí chấp nhận: 

Tạo được 1 điểm trường mới và gán ngay 1 giáo viên vào điểm trường đó từ tab "Giáo viên theo điểm trường" (mục 5.13). 

## **5.13 M13 – Quản lý giáo viên/nhân viên theo điểm trường** 

Tác nhân: Admin, Hiệu trưởng, Phó Hiệu trưởng phụ trách điểm trường 

Khác với Danh bạ/People Picker (M3, chỉ để TÌM và CHỌN người khi giao việc), mục này là màn hình QUẢN TRỊ nhân sự theo từng điểm trường: xem toàn bộ giáo viên/nhân viên đang gắn với 1 điểm trường, thêm người vào điểm trường, hoặc chuyển người sang điểm trường khác khi có điều chuyển/biến động nhân sự sau sáp nhập. 

Các bước chính: 

1. Chọn 1 điểm trường từ dropdown trên cùng → xem danh sách đầy đủ giáo viên/nhân viên đang thuộc điểm trường đó (tên, tổ, chức vụ, số điện thoại bấm gọi được ngay, số việc đang xử lý). 

2. Thêm giáo viên vào điểm trường bằng cách tạo tài khoản mới (mở lại form tạo tài khoản ở mục 5.12 với điểm trường điền sẵn) hoặc chuyển một tài khoản có sẵn từ điểm trường khác sang. 

Trang 15 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

3. Với mỗi giáo viên, có thể bấm "Chuyển điểm trường" để đổi sang điểm trường khác — hệ thống cảnh báo nếu người này đang chủ trì công việc chưa đóng tại điểm trường hiện tại trước khi xác nhận chuyển. Lưu ý UX: 

Danh sách hiển thị dạng bảng trên desktop, dạng thẻ cuộn dọc trên mobile, có ô tìm kiếm nhanh theo tên ngay trong danh sách đã tải. 

Tiêu chí chấp nhận: 

Từ tab này, Admin/Hiệu trưởng chuyển được 1 giáo viên từ điểm trường này sang điểm trường khác trong tối đa 3 lần bấm, và giáo viên đó ngay lập tức xuất hiện đúng trong danh sách nhân sự của điểm trường mới. 

# **6. Yêu cầu phi chức năng** 

## **6.1 UX/UI – Ưu tiên số 1** 

- Toàn bộ giao diện bằng tiếng Việt, ngôn ngữ đơn giản, không dùng thuật ngữ CNTT ("entity", "payload"…) hướng tới người dùng là giáo viên/nhân viên văn phòng không rành công nghệ. 

- Tối đa 3-4 bước cho mọi thao tác nghiệp vụ chính (giao việc, cập nhật tiến độ, phê duyệt). 

- Ưu tiên thành phần trực quan: màu trạng thái nhất quán trong toàn hệ thống (ví dụ: xanh lá = hoàn thành, vàng = đang xử lý/sắp hạn, đỏ = quá hạn/từ chối, xanh dương = mới/nháp), tab đếm số theo trạng thái tương tự mẫu tham chiếu đính kèm. 

- Trạng thái rỗng (empty state), lỗi, và loading đều có thông điệp thân thiện, hướng dẫn hành động tiếp theo. 

- Không dùng nhiều popup/modal lồng nhau; ưu tiên luồng tuyến tính (step-by-step) khi có nhiều bước. 

## **6.2 Responsive & Mobile-first** 

- Giao diện phải hoạt động tốt trên màn hình điện thoại phổ thông (từ 360px) trước, sau đó mở rộng cho tablet/desktop. 

- Danh sách dài (công việc, nhân sự) trên mobile hiển thị dạng thẻ (card) thay vì bảng nhiều cột. 

- Vùng bấm (tap target) tối thiểu 44x44px để dễ thao tác bằng ngón tay. 

- Có thể cân nhắc đóng gói PWA (Progressive Web App) để giáo viên "cài" ứng dụng lên màn hình chính điện thoại mà không cần qua App Store (nằm trong roadmap, không bắt buộc cho demo). 

## **6.3 Hiệu năng (mức demo)** 

- Danh sách 150-200 nhân sự / vài trăm công việc phải tải và tìm kiếm mượt (< 1 giây phản hồi tìm kiếm) nhờ lọc phía server + phân trang/ảo hóa danh sách (virtual scroll) phía Angular. 

- Tải file minh chứng hiển thị tiến trình (progress bar), không chặn thao tác khác. 

## **6.4 Bảo mật (mức demo)** 

- Xác thực bằng JWT (access token + refresh token). 

- Mật khẩu băm (bcrypt); phân quyền kiểm tra ở tầng API (không tin dữ liệu quyền do client gửi lên). 

- Không cần đạt chuẩn bảo mật cấp production (audit log đầy đủ, SSO…) — các mục này thuộc GĐ1 đầy đủ/GĐ3, không bắt buộc cho demo. 

## **6.5 Khả năng mở rộng dữ liệu mẫu (Seed data)** 

- Cần có bộ dữ liệu mẫu thực tế để demo: 1 trường (mô phỏng Trường THCS Phước Tân), 3 điểm trường, ~30-50 giáo viên/nhân viên mẫu (đại diện cho quy mô 100-200), 5-8 tổ chuyên môn, 1 kế 

Trang 16 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

hoạch năm học với các mốc theo bảng mục 2.2, và một số công việc ở nhiều trạng thái khác nhau (để demo Dashboard/Workflow có dữ liệu sinh động). 

Trang 17 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **7. Mô hình dữ liệu (Data Model – tóm tắt)** 

Mô hình dữ liệu dưới đây là tối thiểu cần thiết để chạy demo; thiết kế đủ mở để sau này mở rộng cho GĐ2 (KPI/đánh giá) và GĐ3 (AI/tích hợp) mà không phải phá vỡ cấu trúc. 

|**Entty**|**Trường chính**|**Ghi chú**|
|---|---|---|
|School (Trường)|id, name, code|Demo dùng 1 trường duy<br>nhất (đơn giản hoá đa<br>tenant)|
|Locaton (Điểm<br>trường)|id, schoolId, name, code, address, managerId|Điểm chính, Phân hiệu 1,<br>Phân hiệu 2…|
|OrgUnit (Tổ/Đơn vị)|id, name, type[to_chuyen_mon|to_van_phong|<br>ban_giam_hieu], parentId|Tổ chuyên môn có thể phụ<br>trách nhiều điểm trường|
|User (Nhân sự)|id, fullName, phone, email, avatarUrl, positon,<br>passwordHash|Giáo viên/Nhân viên/BGH<br>— 1 người có thể nhiều vai<br>trò|
|UserRole|userId, role[hieu_truong|pho_hieu_truong|<br>to_truong|giao_vien|nhan_vien|admin],<br>scopeLocatonId, scopeOrgUnitId|Vai trò + phạm vi phụ<br>trách (điểm trường/tổ)|
|Plan (Kế hoạch)|id, level[nam|hoc_ky|quy|thang|tuan], ttle,<br>tmeRange, content, expectedResult, parentPlanId,<br>progressPercent|Cây kế hoạch nhiều cấp, tự<br>tổng hợp progressPercent|
|Task (Công việc)|id, planId (nullable), ttle, descripton, deliverable,<br>priority, dueDate, locatonId, status, progressPercent|status theo Workfow ở<br>mục 7.1|
|TaskAssignment<br>(RACI)|id, taskId, userId, role[chu_tri|phoi_hop|kiem_tra|<br>phe_duyet|theo_doi]|Một task có nhiều dòng<br>gán vai trò|
|TaskLog (Nhật ký)|id, taskId, userId, type, note, createdAt|Lịch sử cập nhật tến độ/ý<br>kiến|
|Atachment (Minh<br>chứng)|id, taskId, fleName, fleUrl, fleType, uploadedBy,<br>uploadedAt|Kéo-thả hoặc chụp ảnh|
|Notfcaton (Thông<br>báo)|id, userId, type, ttle, message, relatedTaskId, isRead,<br>createdAt|Sinh tự động theo sự kiện|
|Comment (Bình luận)|id, taskId, userId, content, mentons[], createdAt|@menton người liên quan|
|AdminAuditLog<br>(Nhật ký quản trị)|id, actorUserId, acton, targetType, targetId,<br>detail, createdAt|Ghi lại hành động<br>tạo/sửa/khoá tài khoản,<br>gán/gỡ vai trò, sửa/xoá<br>điểm trường|



## **7.1 Chuỗi trạng thái công việc (Workflow status)** 

Nhap → Da_giao → Da_tiep_nhan → Dang_thuc_hien → Cho_kiem_tra → (Bo_sung → quay lại Dang_thuc_hien) → Hoan_thanh → Xac_nhan → Dong; có thêm 2 trạng thái phụ Tam_dung và Huy áp dụng ở bất kỳ bước nào theo quyền. 

Trang 18 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **8. Kiến trúc kỹ thuật đề xuất** 

## **8.1 Tổng quan** 

Kiến trúc 3 lớp đơn giản, phù hợp cho một demo dựng nhanh bằng công cụ lập trình AI, nhưng vẫn theo cấu trúc chuẩn để có thể phát triển tiếp lên GĐ2/GĐ3. 

|**Lớp**|**Công nghệ đề xuất**|**Ghi chú**|
|---|---|---|
|Frontend|Angular (phiên bản mới nhất, standalone components) +<br>Angular Material hoặc Tailwind CSS + Angular CDK<br>(drag-drop)|SPA, responsive, lazy-load<br>theo module|
|Backend|Node.js + Express (hoặc NestJS nếu muốn cấu trúc chặt<br>chẽ hơn) + JWT auth|REST API, kiến trúc theo<br>module<br>(controller/service/route)|
|Cơ sở dữ liệu|PostgreSQL + Prisma ORM (hoặc MongoDB + Mongoose<br>nếu ưu tên tốc độ dựng demo)|Đề xuất PostgreSQL vì dữ liệu<br>có quan hệ rõ (Plan cha-con,<br>RACI, phân quyền)|
|Lưu trữ fle minh<br>chứng|Lưu local disk (thư mục /uploads) cho demo, có thể thay<br>bằng S3-compatble storage sau này|Demo không cần cloud<br>storage thật|
|Xác thực & phân<br>quyền|JWT access/refresh token + middleware kiểm tra<br>role/scope|Không cần SSO cho demo|
|Thông báo|Lưu bảng Notfcaton + polling/WebSocket đơn giản<br>(Socket.io tuỳ chọn)|Không bắt buộc realtme cho<br>demo, có thể polling mỗi 30s|



## **8.2 Cấu trúc thư mục đề xuất** 

backend/ (src/modules/{auth, users, orgunits, locations, plans, tasks, attachments, notifications}, src/common, prisma/schema.prisma) — frontend/ (src/app/core, src/app/shared/components/{peoplepicker, contact-card, file-dropzone, status-badge}, src/app/features/{auth, dashboard, plans, tasks, org, notifications}). 

## **8.3 Quy ước API (rút gọn)** 

|**Method & Path**|**Mô tả**|
|---|---|
|POST /api/auth/login|Đăng nhập, trả JWT + danh sách vai trò/phạm vi|
|GET /api/users?<br>search=&orgUnitId=&locatonId=|People Picker – tm nhanh nhân sự, có phân trang|
|GET/POST /api/plans, GET<br>/api/plans/:id/tree|CRUD kế hoạch + lấy cây kế hoạch nhiều cấp|
|GET/POST /api/tasks, PATCH<br>/api/tasks/:id/status|CRUD công việc + chuyển trạng thái workfow|
|POST /api/tasks/:id/atachments<br>(multpart)|Tải minh chứng (hỗ trợ kéo-thả từ frontend)|
|GET /api/tasks/:id/logs, POST<br>/api/tasks/:id/logs|Nhật ký/cập nhật tến độ|
|GET /api/dashboard/overview?<br>locatonId=&orgUnitId=|Số liệu tổng hợp cho Dashboard|
|GET /api/notfcatons, PATCH<br>/api/notfcatons/:id/read|Trung tâm thông báo|



Trang 19 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

|**Method & Path**|**Mô tả**|
|---|---|
|GET/POST/PATCH<br>/api/admin/users, POST .../reset-<br>password|Quản lý tài khoản (chỉ ADMIN/HIEU_TRUONG): danh sách,<br>tạo, sửa, khoá/mở khoá, đặt lại mật khẩu|
|POST/DELETE<br>/api/admin/users/:id/roles,<br>GET /api/admin/permissions-<br>matrix|Cấu hình phân quyền: gán/gỡ vai trò+phạm vi cho tài khoản,<br>xem bảng quyền tham khảo|
|PATCH/DELETE<br>/api/locatons/:id, GET<br>/api/locatons/:id/summary|Sửa/xoá điểm trường, xem số liệu tổng quan (nhân sự, công<br>việc) của điểm trường|



Trang 20 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **9. Luồng nghiệp vụ chính (mô tả luồng)** 

## **9.1 Luồng: Từ kế hoạch tới công việc và tổng hợp tiến độ** 

1. PHT nhập/duyệt một dòng kế hoạch (thời gian – nội dung – kết quả cần đạt). 

2. Từ dòng kế hoạch, PHT tạo 1..n công việc con, mỗi công việc gán người chủ trì bằng People Picker. 3. Người chủ trì cập nhật % tiến độ theo thời gian. 

4. Hệ thống tự tính % hoàn thành của kế hoạch = trung bình (hoặc trọng số) % của các công việc con. 

5. Dashboard/PHT nhìn thấy ngay kế hoạch nào đang chậm dựa trên % tổng hợp so với mốc thời gian. 

## **9.2 Luồng: Giao việc – Thực hiện – Kiểm tra – Phê duyệt** 

1. PHT tạo công việc, gán chủ trì/phối hợp/kiểm tra/phê duyệt qua People Picker → Gửi giao việc. 

2. Giáo viên nhận thông báo, xác nhận nhận việc, trạng thái chuyển "Đang thực hiện". 

3. Giáo viên cập nhật tiến độ định kỳ, kéo-thả minh chứng. 

4. Khi xong, giáo viên bấm "Gửi hoàn thành" (hệ thống kiểm tra đủ minh chứng bắt buộc chưa) → trạng thái "Chờ kiểm tra". 

5. Người kiểm tra (thường là Tổ trưởng) xem kết quả: Xác nhận đạt → chuyển "Chờ phê duyệt" (nếu có cấp duyệt) hoặc yêu cầu bổ sung → quay lại "Bổ sung". 

6. Người phê duyệt (PHT/Hiệu trưởng) xác nhận hoàn thành → "Đóng" công việc. 

7. Ở mọi bước, người đang giữ việc hiển thị rõ trên màn hình theo dõi để BGH biết việc đang tắc ở ai. 

## **9.3 Luồng: Liên hệ nhanh đầu mối** 

1. Người dùng đang xem một công việc, thấy tên người phối hợp ở điểm trường khác. 

2. Bấm vào avatar/tên → mini-card hiện ra với số điện thoại. 

3. Bấm nút gọi → mở ứng dụng gọi điện của điện thoại ngay (liên kết tel:), không cần thoát app hay mở danh bạ. 

Trang 21 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **10. Định hướng UX/UI (Design Guidelines)** 

Tham khảo phong cách giao diện mẫu được cung cấp (ảnh chụp màn hình danh sách báo giá dạng CRM): thanh tab trạng thái có đếm số và màu badge riêng biệt, ô tìm kiếm nổi bật phía trên bảng, bảng danh sách rõ ràng có thể thao tác nhanh (…), nút hành động chính nổi bật ở góc phải trên. Bản demo TN EDU nên kế thừa các nguyên tắc trực quan này cho danh sách Công việc/Kế hoạch, đồng thời bổ sung ưu tiên mobile. 

## **10.1 Bảng màu trạng thái đề xuất (áp dụng nhất quán toàn hệ thống)** 

|**Trạng thái**|**Màu gợi ý**|**Ý nghĩa**|
|---|---|---|
|Nháp / Mới|Xanh dương nhạt|Chưa giao chính thức hoặc vừa được giao|
|Đang thực hiện|Xanh dương đậm|Người phụ trách đang xử lý, trong hạn|
|Chờ kiểm tra / Chờ phê<br>duyệt|Vàng cam|Đang chờ người khác xử lý — cần biết đang chờ<br>AI|
|Bổ sung|Cam đậm|Bị trả lại, cần chỉnh sửa|
|Hoàn thành / Đóng|Xanh lá|Đã xong|
|Quá hạn|Đỏ|Cảnh báo — luôn hiển thị ưu tên trên các danh<br>sách|



## **10.2 Thành phần dùng chung (Shared Components) cần dựng trước tiên** 

- StatusBadge – nhãn màu trạng thái dùng lại ở mọi màn hình. 

- PeoplePicker – tìm & chọn người (single/multi), có avatar + badge tải việc. 

- ContactMiniCard – thẻ liên hệ nhanh với nút gọi điện. 

- FileDropzone – khu vực kéo-thả/chọn/chụp ảnh minh chứng, có xem trước. 

- PlanTree – cây kế hoạch thu gọn/mở rộng nhiều cấp. 

- StatusTabsCounter – thanh tab trạng thái có đếm số (tham chiếu ảnh mẫu). 

## **10.3 Nguyên tắc mobile** 

- Điều hướng chính bằng bottom navigation bar trên mobile (Việc của tôi, Kế hoạch, Thông báo, Cá nhân) thay vì sidebar như trên desktop. 

- Form dài chia nhỏ theo bước (stepper) thay vì một trang cuộn dài. 

- Ưu tiên hành động phổ biến nhất (cập nhật tiến độ, gọi điện, đính kèm minh chứng) luôn hiển thị trong tầm ngón tay cái (bottom sheet, floating action button). 

Trang 22 / 23 

TN EDU – SRS Demo (Angular + Node.js) 

# **11. Kế hoạch xây dựng bản Demo (đề xuất)** 

|**Giai đoạn**|**Nội dung**|**Đầu ra**|
|---|---|---|
|Sprint 0 (0.5<br>ngày)|Khởi tạo repo, cấu hình Angular + Node.js +<br>PostgreSQL/Prisma, seed data mẫu|Chạy được ứng dụng rỗng end-to-<br>end (login → dashboard trống)|
|Sprint 1 (1-1.5<br>ngày)|M2, M3, M11: cơ cấu tổ chức, điểm trường, danh<br>bạ + People Picker, phân quyền cơ bản|Đăng nhập theo vai trò, tm chọn<br>người trong danh sách mẫu ≥150<br>người|
|Sprint 2 (1.5-2<br>ngày)|M4, M5: kế hoạch nhiều cấp + tạo/giao công việc<br>RACI|Nhập được 1 kế hoạch mẫu theo<br>bảng 2.2, sinh công việc con, giao<br>việc qua People Picker|
|Sprint 3 (1.5-2<br>ngày)|M6, M7: cập nhật tến độ, kéo-thả minh chứng,<br>workfow kiểm tra-phê duyệt|Chạy được trọn vòng đời 1 công<br>việc từ giao đến đóng|
|Sprint 4 (1 ngày)|M8, M9, M10: liên hệ nhanh, thông báo,<br>dashboard/việc của tôi|Demo được kịch bản đầy đủ 5 vấn<br>đề của BGH|
|Sprint 5 (0.5-1<br>ngày)|Polish UX, responsive mobile, dữ liệu demo hoàn<br>chỉnh, chuẩn bị kịch bản trình diễn|Sẵn sàng demo trước Ban Giám<br>hiệu|



# **12. Tiêu chí nghiệm thu bản Demo** 

- Đăng nhập được với ít nhất 4 vai trò khác nhau (Hiệu trưởng, PHT, Tổ trưởng, Giáo viên) và thấy đúng phạm vi dữ liệu tương ứng. 

- Tạo được 1 kế hoạch năm học theo mẫu thực tế (thời gian – nội dung – kết quả cần đạt), sinh ra công việc con và thấy % tiến độ tự tổng hợp. 

- Giao được 1 công việc mới cho 1 người chủ trì + 2 người phối hợp bằng People Picker trong danh sách mẫu ≥ 150 người, trong dưới 60 giây. 

- Từ vai trò giáo viên, cập nhật tiến độ và kéo-thả tối thiểu 1 file minh chứng, gửi hoàn thành. 

- Từ vai trò tổ trưởng/PHT, thấy việc đang chờ kiểm tra, xem người đang giữ việc, phê duyệt hoặc yêu cầu bổ sung. 

- Từ màn hình chi tiết công việc, gọi thử được cho 1 người liên quan chỉ bằng 2 lần chạm (mô phỏng qua liên kết tel:). 

- Dashboard hiển thị đúng số liệu tổng quan và cho phép drill-down xuống danh sách công việc quá hạn. 

- Toàn bộ giao diện hiển thị và thao tác được bình thường trên khung hình rộng 375px (mô phỏng điện thoại phổ thông). 

Trang 23 / 23 

