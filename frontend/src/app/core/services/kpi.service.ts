import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { TaskService } from './task.service';
import { AuthService } from './auth.service';
import { KpiRowItem, KpiSummaryScores, KpiEvaluationSheet, KpiPeriod } from '../models/kpi.models';
import { TaskItem } from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class KpiService {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  private readonly STORAGE_KEY_PREFIX = 'tn_edu_kpi_sheet_';

  /**
   * Tính toán lại các chỉ số của từng dòng và toàn bộ bảng đánh giá KPI
   */
  recalculateSheet(rows: KpiRowItem[]): { rows: KpiRowItem[]; summary: KpiSummaryScores } {
    let totalTargetWeighted = 0;
    let totalActualQuantityWeighted = 0;
    let totalQualityWeighted = 0;
    let totalTimelineWeighted = 0;
    let totalLeadershipWeighted = 0;

    const computedRows = rows.map((row, index) => {
      const stt = index + 1;
      const targetQuantity = Number(row.targetQuantity) || 0;
      const weightCoefficient = Number(row.weightCoefficient) || 1;
      const targetWeightedQuantity = Math.round(targetQuantity * weightCoefficient * 100) / 100;

      const actualQuantityVal = Number(row.actualQuantityVal ?? targetQuantity);
      const actualWeightedQuantity = Math.round(actualQuantityVal * weightCoefficient * 100) / 100;

      const qualityWeightedScore = Number(row.qualityWeightedScore ?? actualWeightedQuantity);
      const timelineWeightedScore = Number(row.timelineWeightedScore ?? actualWeightedQuantity);
      const leadershipWeightedScore = Number(row.leadershipWeightedScore ?? actualWeightedQuantity);

      totalTargetWeighted += targetWeightedQuantity;
      totalActualQuantityWeighted += actualWeightedQuantity;
      totalQualityWeighted += qualityWeightedScore;
      totalTimelineWeighted += timelineWeightedScore;
      totalLeadershipWeighted += leadershipWeightedScore;

      return {
        ...row,
        stt,
        targetQuantity,
        weightCoefficient,
        targetWeightedQuantity,
        actualQuantityVal,
        actualWeightedQuantity,
        qualityWeightedScore,
        timelineWeightedScore,
        leadershipWeightedScore,
      };
    });

    totalTargetWeighted = Math.round(totalTargetWeighted * 100) / 100;
    totalActualQuantityWeighted = Math.round(totalActualQuantityWeighted * 100) / 100;
    totalQualityWeighted = Math.round(totalQualityWeighted * 100) / 100;
    totalTimelineWeighted = Math.round(totalTimelineWeighted * 100) / 100;
    totalLeadershipWeighted = Math.round(totalLeadershipWeighted * 100) / 100;

    const scoreA = totalTargetWeighted > 0 ? Math.round((totalActualQuantityWeighted / totalTargetWeighted) * 10000) / 100 : 0;
    const scoreB = totalTargetWeighted > 0 ? Math.round((totalQualityWeighted / totalTargetWeighted) * 10000) / 100 : 0;
    const scoreC = totalTargetWeighted > 0 ? Math.round((totalTimelineWeighted / totalTargetWeighted) * 10000) / 100 : 0;
    const scoreD = totalTargetWeighted > 0 ? Math.round((totalLeadershipWeighted / totalTargetWeighted) * 10000) / 100 : 0;

    const finalScore = Math.round(((scoreA + scoreB + scoreC + scoreD) / 4) * 100) / 100;

    let ratingCategory = 'Hoàn thành xuất sắc nhiệm vụ (Loại A)';
    let ratingColor = '#16A34A'; // Green
    if (finalScore < 65) {
      ratingCategory = 'Không hoàn thành nhiệm vụ (Loại D)';
      ratingColor = '#DC2626'; // Red
    } else if (finalScore < 80) {
      ratingCategory = 'Hoàn thành nhiệm vụ (Loại C)';
      ratingColor = '#D97706'; // Amber
    } else if (finalScore < 90) {
      ratingCategory = 'Hoàn thành tốt nhiệm vụ (Loại B)';
      ratingColor = '#2563EB'; // Blue
    }

    const summary: KpiSummaryScores = {
      totalTargetWeighted,
      totalActualQuantityWeighted,
      totalQualityWeighted,
      totalTimelineWeighted,
      totalLeadershipWeighted,
      scoreA_Quantity: scoreA,
      scoreB_Quality: scoreB,
      scoreC_Timeline: scoreC,
      scoreD_Leadership: scoreD,
      finalScore,
      ratingCategory,
      ratingColor,
    };

    return { rows: computedRows, summary };
  }

  /**
   * Tạo bộ dữ liệu mẫu chuẩn 100% khớp với ảnh người dùng cung cấp
   */
  getSampleDataFromImage(): KpiRowItem[] {
    return [
      {
        id: 'kpi-sample-1',
        stt: 1,
        taskTitle: 'Báo cáo kết quả thực hiện nhiệm vụ công tác hàng tháng và phương hướng tháng tới',
        deliverable: 'Báo cáo',
        targetQuantity: 3,
        timeline: 'Hàng tháng',
        weightCoefficient: 1.5,
        targetWeightedQuantity: 4.5,
        actualQuantityNote: '3',
        actualQuantityVal: 3,
        actualWeightedQuantity: 4.5,
        qualityNote: '3 (sửa đổi 1- 2 lần)',
        qualityWeightedScore: 3.5,
        timelineNote: '3',
        timelineWeightedScore: 3.5,
        leadershipNote: '3',
        leadershipWeightedScore: 3.5,
      },
      {
        id: 'kpi-sample-2',
        stt: 2,
        taskTitle: 'Báo cáo kết quả lãnh đạo thực hiện nhiệm vụ phát triển kinh tế - xã hội 6 tháng đầu năm',
        deliverable: 'Báo cáo',
        targetQuantity: 1,
        timeline: 'Quý II',
        weightCoefficient: 1.5,
        targetWeightedQuantity: 1.5,
        actualQuantityNote: '1',
        actualQuantityVal: 1,
        actualWeightedQuantity: 1.5,
        qualityNote: '1 (phải sửa đổi 1- 2 lần)',
        qualityWeightedScore: 1.0,
        timelineNote: '1',
        timelineWeightedScore: 1.5,
        leadershipNote: '1',
        leadershipWeightedScore: 1.5,
      },
      {
        id: 'kpi-sample-3',
        stt: 3,
        taskTitle: 'Lãnh đạo thực hiện nhiệm vụ thu ngân sách, giải ngân vốn đầu tư công, xây dựng nông thôn mới trên địa bàn',
        deliverable: 'công văn',
        targetQuantity: 1,
        timeline: 'Hằng quý',
        weightCoefficient: 1.0,
        targetWeightedQuantity: 1.0,
        actualQuantityNote: '1',
        actualQuantityVal: 1,
        actualWeightedQuantity: 1.0,
        qualityNote: '1',
        qualityWeightedScore: 1.0,
        timelineNote: '1',
        timelineWeightedScore: 1.0,
        leadershipNote: '1',
        leadershipWeightedScore: 1.0,
      },
      {
        id: 'kpi-sample-4',
        stt: 4,
        taskTitle: 'Lãnh đạo nâng cao chất lượng cải cách hành chính, chuyển đổi số, mức độ hài lòng của người dân và doanh nghiệp',
        deliverable: 'Báo cáo',
        targetQuantity: 1,
        timeline: 'Hằng quý',
        weightCoefficient: 1.5,
        targetWeightedQuantity: 1.5,
        actualQuantityNote: '1',
        actualQuantityVal: 1,
        actualWeightedQuantity: 1.5,
        qualityNote: '1 (phải sửa đổi 1- 2 lần)',
        qualityWeightedScore: 1.0,
        timelineNote: '1',
        timelineWeightedScore: 1.5,
        leadershipNote: '1',
        leadershipWeightedScore: 1.5,
      },
      {
        id: 'kpi-sample-5',
        stt: 5,
        taskTitle: 'Chỉ đạo thực hiện các nội dung do cấp trên giao BTV Tỉnh ủy, các cơ quan chuyên trách TMGV Tỉnh ủy',
        deliverable: 'Báo cáo, kế hoạch',
        targetQuantity: 5,
        timeline: 'Theo yêu cầu của cấp có thẩm',
        weightCoefficient: 2.0,
        targetWeightedQuantity: 10.0,
        actualQuantityNote: '5',
        actualQuantityVal: 5,
        actualWeightedQuantity: 10.0,
        qualityNote: '9 (phải sửa đổi 1- 2 lần)',
        qualityWeightedScore: 8.0,
        timelineNote: '4.5',
        timelineWeightedScore: 8.0,
        leadershipNote: '4.5',
        leadershipWeightedScore: 8.0,
      },
    ];
  }

  /**
   * Nạp tự động các nhiệm vụ từ danh sách công việc được giao của người dùng
   */
  importFromAssignedTasks(period: KpiPeriod): Observable<KpiRowItem[]> {
    const user = this.authService.currentUser();
    const userId = user?.id;

    return this.taskService.getTasks({ pageSize: 100 }).pipe(
      map((res) => {
        const myTasks = (res.items || []).filter((t) =>
          t.assignments?.some((a) => a.userId === userId || a.user?.id === userId)
        );

        if (myTasks.length === 0) {
          // Nếu người dùng chưa có task được giao trực tiếp, lấy top 5 tasks của trường để demo
          return this.convertTasksToKpiRows(res.items.slice(0, 5));
        }

        return this.convertTasksToKpiRows(myTasks);
      })
    );
  }

  private convertTasksToKpiRows(tasks: TaskItem[]): KpiRowItem[] {
    return tasks.map((t, idx) => {
      // Xác định loại sản phẩm đầu ra dựa theo tên công việc
      let deliverable = 'Báo cáo, Kế hoạch';
      const titleLower = t.title.toLowerCase();
      if (titleLower.includes('đề kiểm tra') || titleLower.includes('ma trận')) deliverable = 'Ma trận & Đề thi';
      else if (titleLower.includes('hồ sơ') || titleLower.includes('học bạ')) deliverable = 'Bộ hồ sơ số hóa';
      else if (titleLower.includes('báo cáo') || titleLower.includes('thống kê')) deliverable = 'Báo cáo tổng hợp';
      else if (titleLower.includes('kế hoạch') || titleLower.includes('phân phối')) deliverable = 'Kế hoạch chuyên môn';
      else if (titleLower.includes('tập huấn') || titleLower.includes('hội thảo')) deliverable = 'Tài liệu tập huấn';
      else if (titleLower.includes('rà soát') || titleLower.includes('kiểm tra')) deliverable = 'Biên bản kiểm tra';
      else if (titleLower.includes('lắp đặt') || titleLower.includes('bảo dưỡng') || titleLower.includes('trang thiết bị')) deliverable = 'Biên bản nghiệm thu';

      // Xác định hệ số quy đổi theo độ ưu tiên
      let weight = 1.0;
      if (t.priority === 'KHAN_CAP') weight = 2.0;
      else if (t.priority === 'CAO') weight = 1.5;

      const targetQty = 1;
      const targetWeighted = targetQty * weight;
      const isCompleted = t.status === 'HOAN_THANH' || t.status === 'DONG';
      const actualQty = isCompleted ? 1 : t.progressPercent >= 60 ? 0.8 : 0.5;
      const actualWeighted = Math.round(actualQty * weight * 100) / 100;

      // Chất lượng: nếu có sửa đổi/bổ sung thì giảm điểm
      const isBoSung = t.status === 'BO_SUNG';
      const qualityScore = isBoSung ? Math.round(actualWeighted * 0.7 * 100) / 100 : actualWeighted;
      const qualityNote = isBoSung ? '1 (phải bổ sung/sửa đổi)' : isCompleted ? 'Đạt chuẩn xuất sắc' : 'Đang hoàn thiện';

      // Tiến độ: nếu quá hạn thì giảm điểm
      const timelineScore = t.isOverdue ? Math.round(actualWeighted * 0.75 * 100) / 100 : actualWeighted;
      const timelineNote = t.isOverdue ? 'Chậm tiến độ' : isCompleted ? 'Đúng hạn' : 'Đang theo dõi';

      // Điều hành / Phối hợp
      const leadershipScore = actualWeighted;
      const leadershipNote = 'Chủ động phối hợp tốt';

      return {
        id: `kpi-row-${t.id || idx + 1}`,
        stt: idx + 1,
        taskId: t.id,
        taskCode: t.code || undefined,
        taskTitle: t.title,
        deliverable,
        targetQuantity: targetQty,
        timeline: t.dueDate ? `Hạn ${t.dueDate.slice(0, 10).split('-').reverse().join('/')}` : 'Học kỳ I',
        weightCoefficient: weight,
        targetWeightedQuantity: targetWeighted,
        actualQuantityNote: `${actualQty}`,
        actualQuantityVal: actualQty,
        actualWeightedQuantity: actualWeighted,
        qualityNote,
        qualityWeightedScore: qualityScore,
        timelineNote,
        timelineWeightedScore: timelineScore,
        leadershipNote,
        leadershipWeightedScore: leadershipScore,
      };
    });
  }

  /**
   * Lưu trữ bảng đánh giá KPI vào LocalStorage
   */
  saveEvaluationSheet(sheet: KpiEvaluationSheet): void {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${sheet.userId}_${sheet.period}`;
      localStorage.setItem(key, JSON.stringify(sheet));
    } catch (e) {
      console.error('Lỗi khi lưu bảng KPI vào LocalStorage:', e);
    }
  }

  /**
   * Lấy bảng đánh giá KPI đã lưu hoặc khởi tạo mới
   */
  loadEvaluationSheet(period: KpiPeriod): Observable<KpiEvaluationSheet> {
    const user = this.authService.currentUser();
    const role = this.authService.activeRole();
    const userId = user?.id || 'guest';
    const key = `${this.STORAGE_KEY_PREFIX}${userId}_${period}`;

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as KpiEvaluationSheet;
        const recalculated = this.recalculateSheet(parsed.rows);
        parsed.rows = recalculated.rows;
        parsed.summary = recalculated.summary;
        return of(parsed);
      } catch (e) {
        console.warn('Không thể parse dữ liệu đã lưu, chuyển về mẫu mặc định');
      }
    }

    // Khởi tạo bảng mới với dữ liệu mẫu từ ảnh
    const sampleRows = this.getSampleDataFromImage();
    const { rows, summary } = this.recalculateSheet(sampleRows);

    const periodLabel = this.getPeriodLabel(period);
    const newSheet: KpiEvaluationSheet = {
      id: `kpi-sheet-${userId}-${period}`,
      userId,
      userName: user?.fullName || 'Phạm Thị Nam',
      userTitle: user?.title || 'Cán bộ Quản lý / Giáo viên',
      period,
      periodLabel,
      schoolYear: '2026 - 2027',
      locationName: role?.scopeName || 'Trường TH và THCS Phước Tân',
      orgUnitName: user?.primaryOrgUnitName || 'Ban Giám hiệu',
      evaluatorRole: 'T/M BAN THƯỜNG VỤ',
      rows,
      summary,
      updatedAt: new Date().toISOString(),
    };

    return of(newSheet);
  }

  getPeriodLabel(period: KpiPeriod): string {
    switch (period) {
      case 'QUY_1': return 'Quý I (Tháng 1 - 3)';
      case 'QUY_2': return 'Quý II (Tháng 4 - 6)';
      case 'QUY_3': return 'Quý III (Tháng 7 - 9)';
      case 'QUY_4': return 'Quý IV (Tháng 10 - 12)';
      case 'HOC_KY_1': return 'Học kỳ I (Năm học 2026 - 2027)';
      case 'HOC_KY_2': return 'Học kỳ II (Năm học 2026 - 2027)';
      case 'NAM_HOC': return 'Cả Năm học 2026 - 2027';
      default: return 'Kỳ đánh giá';
    }
  }

  /**
   * KẾT XUẤT FILE EXCEL THEO MẪU CHUẨN 100% NHƯ ẢNH
   */
  exportToExcel(sheet: KpiEvaluationSheet, customFileName?: string): void {
    const fileName = customFileName || `Bang_Tinh_KPI_Ca_Nhan_${sheet.userName.replace(/\s+/g, '_')}_${sheet.period}.xls`;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Bảng tính KPI cá nhân</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                  <x:Print>
                    <x:ValidPrinterInfo/>
                    <x:PaperSizeIndex>9</x:PaperSizeIndex>
                    <x:HorizontalResolution>600</x:HorizontalResolution>
                    <x:VerticalResolution>600</x:VerticalResolution>
                  </x:Print>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000000; }
          .header-table { width: 100%; border: none; margin-bottom: 10px; }
          .title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 10px 0 4px 0; }
          .subtitle { font-size: 11pt; font-style: italic; text-align: center; margin-bottom: 15px; }
          
          table.kpi-main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          table.kpi-main-table th, table.kpi-main-table td {
            border: 1px solid #000000;
            padding: 5px 6px;
            vertical-align: middle;
          }
          table.kpi-main-table th {
            font-weight: bold;
            text-align: center;
            background-color: #FFFFFF;
          }
          
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .red-text { color: #FF0000; font-weight: bold; }
          
          table.summary-kpi-table {
            width: 420px;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10pt;
          }
          table.summary-kpi-table th, table.summary-kpi-table td {
            border: 1px solid #000000;
            padding: 4px 8px;
          }
          
          .formula-note {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 12px;
          }
          
          .sign-table {
            width: 100%;
            border: none;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <!-- TIÊU NGỮ VÀ ĐƠN VỊ -->
        <table class="header-table">
          <tr>
            <td style="width: 45%; text-align: center; vertical-align: top;">
              <strong>TRƯỜNG TH & THCS PHƯỚC TÂN</strong><br/>
              <span>Tổ chuyên môn / Phòng ban: ${sheet.orgUnitName}</span>
            </td>
            <td style="width: 55%; text-align: center; vertical-align: top;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
              <span style="text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span><br/>
              <span style="font-style: italic; font-size: 9.5pt;">Biên Hòa, ngày ${dateStr}</span>
            </td>
          </tr>
        </table>

        <!-- TIÊU ĐỀ BẢNG TÍNH -->
        <div class="title">BẢNG ĐÁNH GIÁ VÀ TÍNH ĐIỂM KPI CÁ NHÂN</div>
        <div class="subtitle">Kỳ đánh giá: ${sheet.periodLabel} • Năm học: ${sheet.schoolYear} • Họ và tên: <strong>${sheet.userName}</strong> (${sheet.userTitle || 'Cán bộ'})</div>

        <!-- BẢNG TÍNH KPI CHÍNH 15 CỘT -->
        <table class="kpi-main-table">
          <thead>
            <!-- Hàng tiêu đề 1 -->
            <tr>
              <th rowspan="2" style="width: 35px;">STT</th>
              <th rowspan="2" style="width: 260px;">Nhiệm vụ theo quý</th>
              <th rowspan="2" style="width: 90px;">Sản phẩm</th>
              <th rowspan="2" style="width: 55px;">Số lượng</th>
              <th rowspan="2" style="width: 85px;">Tiến độ</th>
              <th rowspan="2" style="width: 55px;">Hệ số<br/>quy đổi</th>
              <th rowspan="2" style="width: 65px;">Số lượng<br/>quy đổi</th>
              <th colspan="2">KPI<br/>(Số lượng)</th>
              <th colspan="2">KPI<br/>(Chất lượng)</th>
              <th colspan="2">KPI<br/>(Tiến độ)</th>
              <th colspan="2">KPI (Lãnh đạo,<br/>chỉ đạo, điều hành)</th>
            </tr>
            <!-- Hàng tiêu đề 2 -->
            <tr>
              <th style="width: 65px;">Thực tế<br/>hoàn thành</th>
              <th style="width: 55px;">Quy đổi</th>
              <th style="width: 95px;">Thực tế<br/>hoàn thành</th>
              <th style="width: 55px;">Quy đổi</th>
              <th style="width: 65px;">Thực tế<br/>hoàn thành</th>
              <th style="width: 55px;">Quy đổi</th>
              <th style="width: 65px;">Thực tế<br/>hoàn thành</th>
              <th style="width: 55px;">Quy đổi</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Render từng dòng nhiệm vụ
    sheet.rows.forEach((row) => {
      excelHtml += `
        <tr>
          <td class="text-center font-bold">${row.stt}</td>
          <td class="text-left">${row.taskTitle}</td>
          <td class="text-center">${row.deliverable}</td>
          <td class="text-center">${row.targetQuantity}</td>
          <td class="text-center">${row.timeline}</td>
          <td class="text-center font-bold">${row.weightCoefficient}</td>
          <td class="text-center font-bold">${row.targetWeightedQuantity}</td>

          <!-- KPI Số lượng -->
          <td class="text-center">${row.actualQuantityNote || row.actualQuantityVal}</td>
          <td class="text-center font-bold">${row.actualWeightedQuantity}</td>

          <!-- KPI Chất lượng -->
          <td class="text-center">${row.qualityNote || ''}</td>
          <td class="text-center font-bold">${row.qualityWeightedScore}</td>

          <!-- KPI Tiến độ -->
          <td class="text-center">${row.timelineNote || ''}</td>
          <td class="text-center font-bold">${row.timelineWeightedScore}</td>

          <!-- KPI Lãnh đạo / Phối hợp -->
          <td class="text-center">${row.leadershipNote || ''}</td>
          <td class="text-center font-bold">${row.leadershipWeightedScore}</td>
        </tr>
      `;
    });

    // Dòng TỔNG CỘNG với số lượng quy đổi màu đỏ chuẩn như ảnh
    excelHtml += `
        <tr>
          <td colspan="6" class="text-center font-bold">TỔNG CỘNG</td>
          <td class="text-center red-text">${sheet.summary.totalTargetWeighted}</td>
          <td></td>
          <td class="text-center font-bold">${sheet.summary.totalActualQuantityWeighted}</td>
          <td></td>
          <td class="text-center font-bold">${sheet.summary.totalQualityWeighted}</td>
          <td></td>
          <td class="text-center font-bold">${sheet.summary.totalTimelineWeighted}</td>
          <td></td>
          <td class="text-center font-bold">${sheet.summary.totalLeadershipWeighted}</td>
        </tr>
      </tbody>
    </table>

    <br/>
    <!-- BẢNG TỔNG HỢP KẾT QUẢ ĐIỂM KPI (A, B, C, D, KPI NV1) -->
    <table class="summary-kpi-table">
      <tr>
        <td style="width: 220px;" class="font-bold">KPI (SỐ LƯỢNG)</td>
        <td style="width: 45px;" class="text-center font-bold">A</td>
        <td style="width: 75px;" class="text-right font-bold">${sheet.summary.scoreA_Quantity}</td>
      </tr>
      <tr>
        <td class="font-bold">KPI (CHẤT LƯỢNG)</td>
        <td class="text-center font-bold">B</td>
        <td class="text-right font-bold">${sheet.summary.scoreB_Quality}</td>
      </tr>
      <tr>
        <td class="font-bold">KPI (TIẾN ĐỘ)</td>
        <td class="text-center font-bold">C</td>
        <td class="text-right font-bold">${sheet.summary.scoreC_Timeline}</td>
      </tr>
      <tr>
        <td class="font-bold">KPI LÃNH ĐẠO ĐIỀU HÀNH</td>
        <td class="text-center font-bold">D</td>
        <td class="text-right font-bold">${sheet.summary.scoreD_Leadership}</td>
      </tr>
      <tr style="background-color: #F8FAFC;">
        <td class="font-bold red-text" style="font-size: 11pt;">KPI TỔNG HỢP (KPI NV1)</td>
        <td class="text-center font-bold red-text" style="font-size: 11pt;">KPI NV1</td>
        <td class="text-right font-bold red-text" style="font-size: 11pt;">${sheet.summary.finalScore}</td>
      </tr>
      <tr>
        <td colspan="2" class="font-bold">XẾP LOẠI ĐÁNH GIÁ</td>
        <td class="text-right font-bold" style="color: ${sheet.summary.ratingColor};">${sheet.summary.ratingCategory}</td>
      </tr>
    </table>

    <!-- CÔNG THỨC HƯỚNG DẪN -->
    <div class="formula-note">
      Công thức tính điểm KPI theo hướng dẫn: (A+B+C+D)/4
    </div>

    <!-- KHỐI CHỮ KÝ -->
    <table class="sign-table">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <strong>NGƯỜI TỰ ĐÁNH GIÁ</strong><br/>
          <span style="font-style: italic; font-size: 9pt;">(Ký và ghi rõ họ tên)</span>
          <br/><br/><br/><br/>
          <strong>${sheet.userName}</strong>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <strong>${sheet.evaluatorRole || 'T/M BAN THƯỜNG VỤ'}</strong><br/>
          <span style="font-style: italic; font-size: 9pt;">(Ký, đóng dấu và ghi rõ họ tên)</span>
          <br/><br/><br/><br/>
          <strong>Cô Phạm Thị Nam</strong>
        </td>
      </tr>
    </table>

    </body>
    </html>
    `;

    const blob = new Blob(['\ufeff' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
