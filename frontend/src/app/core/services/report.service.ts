import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { TaskService } from './task.service';
import { TaskItem, TaskStatus, TaskPriority } from '../models/task.models';

export interface ReportFilterCriteria {
  locationId?: string;
  orgUnitId?: string;
  planId?: string;
  status?: string;
  priority?: string;
  isOverdue?: boolean;
  timeRange?: 'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'THIS_TERM' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  search?: string;
  assigneeId?: string;
  inPlanOnly?: boolean;
  outOfPlanOnly?: boolean;
}

export interface ReportSummaryKpis {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  waitingConfirmTasks: number;
  overdueTasks: number;
  completionRate: number;
  inPlanCount: number;
  outOfPlanCount: number;
}

export interface BreakdownStatItem {
  id: string;
  name: string;
  code?: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private taskService = inject(TaskService);

  /**
   * Lấy toàn bộ danh sách công việc theo bộ lọc báo cáo
   */
  getReportTasks(filters: ReportFilterCriteria = {}): Observable<TaskItem[]> {
    return this.taskService.getTasks({ pageSize: 100 }).pipe(
      map((res) => {
        let items = res.items || [];

        // 1. Lọc theo Điểm trường
        if (filters.locationId) {
          items = items.filter((t) => t.location?.id === filters.locationId || t.locationId === filters.locationId);
        }

        // 2. Lọc theo Tổ chuyên môn
        if (filters.orgUnitId) {
          items = items.filter((t) => t.orgUnit?.id === filters.orgUnitId || t.orgUnitId === filters.orgUnitId);
        }

        // 3. Lọc theo Kế hoạch / Đột xuất
        if (filters.inPlanOnly) {
          items = items.filter((t) => !!t.planId);
        } else if (filters.outOfPlanOnly) {
          items = items.filter((t) => !t.planId);
        } else if (filters.planId) {
          items = items.filter((t) => t.planId === filters.planId);
        }

        // 4. Lọc theo Trạng thái
        if (filters.status) {
          items = items.filter((t) => t.status === filters.status);
        }

        // 5. Lọc theo Quá hạn
        if (filters.isOverdue) {
          items = items.filter((t) => t.isOverdue);
        }

        // 6. Lọc theo Mức ưu tiên
        if (filters.priority) {
          items = items.filter((t) => t.priority === filters.priority);
        }

        // 7. Lọc theo Người chủ trì / Phân công
        if (filters.assigneeId) {
          items = items.filter((t) =>
            t.assignments?.some((a) => a.userId === filters.assigneeId || a.user?.id === filters.assigneeId)
          );
        }

        // 8. Lọc theo Khoảng thời gian
        if (filters.timeRange && filters.timeRange !== 'ALL') {
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);

          if (filters.timeRange === 'THIS_MONTH') {
            const curMonthStr = todayStr.slice(0, 7); // YYYY-MM
            items = items.filter((t) => (t.dueDate && t.dueDate.startsWith(curMonthStr)) || (t.startDate && t.startDate.startsWith(curMonthStr)));
          } else if (filters.timeRange === 'THIS_WEEK') {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - day + 1);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            items = items.filter((t) => {
              if (!t.dueDate) return false;
              const d = new Date(t.dueDate);
              return d >= startOfWeek && d <= endOfWeek;
            });
          } else if (filters.timeRange === 'THIS_TERM') {
            // Học kỳ I: 2026-08-15 đến 2027-01-15
            items = items.filter((t) => {
              if (!t.dueDate) return true;
              return t.dueDate >= '2026-08-01' && t.dueDate <= '2027-01-31';
            });
          } else if (filters.timeRange === 'CUSTOM') {
            if (filters.startDate) {
              items = items.filter((t) => !t.startDate || t.startDate >= filters.startDate!);
            }
            if (filters.endDate) {
              items = items.filter((t) => !t.dueDate || t.dueDate <= filters.endDate!);
            }
          }
        }

        // 9. Lọc theo Từ khóa tìm kiếm
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          items = items.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.code && t.code.toLowerCase().includes(q)) ||
              (t.description && t.description.toLowerCase().includes(q)) ||
              t.assignments?.some((a) => a.user?.fullName?.toLowerCase().includes(q))
          );
        }

        return items;
      })
    );
  }

  /**
   * Tính toán các chỉ số tổng hợp KPI báo cáo
   */
  computeSummaryKpis(tasks: TaskItem[]): ReportSummaryKpis {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length;
    const inProgress = tasks.filter((t) => t.status === 'DANG_THUC_HIEN' || t.status === 'DA_TIEP_NHAN' || t.status === 'DA_GIAO').length;
    const waitingConfirm = tasks.filter((t) => t.status === 'CHO_KIEM_TRA').length;
    const overdue = tasks.filter((t) => t.isOverdue).length;
    const inPlan = tasks.filter((t) => !!t.planId).length;
    const outOfPlan = tasks.filter((t) => !t.planId).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      waitingConfirmTasks: waitingConfirm,
      overdueTasks: overdue,
      completionRate: rate,
      inPlanCount: inPlan,
      outOfPlanCount: outOfPlan,
    };
  }

  /**
   * Thống kê tiến độ theo 3 Điểm trường
   */
  computeLocationBreakdown(tasks: TaskItem[]): BreakdownStatItem[] {
    const locMap: { [key: string]: { name: string; total: number; completed: number; inProgress: number; overdue: number } } = {
      'DIEM_CHINH': { name: 'Điểm chính (Trung tâm)', total: 0, completed: 0, inProgress: 0, overdue: 0 },
      'PHAN_HIEU_1': { name: 'Phân hiệu 1 (Tân Lập)', total: 0, completed: 0, inProgress: 0, overdue: 0 },
      'PHAN_HIEU_2': { name: 'Phân hiệu 2 (Vườn Dừa)', total: 0, completed: 0, inProgress: 0, overdue: 0 },
    };

    tasks.forEach((t) => {
      const code = t.location?.code || (t.locationId?.includes('ph1') ? 'PHAN_HIEU_1' : t.locationId?.includes('ph2') ? 'PHAN_HIEU_2' : 'DIEM_CHINH');
      const target = locMap[code] || locMap['DIEM_CHINH'];
      target.total++;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') target.completed++;
      else if (t.status === 'DANG_THUC_HIEN' || t.status === 'DA_TIEP_NHAN' || t.status === 'DA_GIAO') target.inProgress++;
      if (t.isOverdue) target.overdue++;
    });

    return Object.keys(locMap).map((code) => {
      const item = locMap[code];
      const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      return {
        id: code,
        name: item.name,
        code,
        total: item.total,
        completed: item.completed,
        inProgress: item.inProgress,
        overdue: item.overdue,
        completionRate: rate,
      };
    });
  }

  /**
   * Thống kê tiến độ theo Tổ chuyên môn
   */
  computeOrgUnitBreakdown(tasks: TaskItem[]): BreakdownStatItem[] {
    const orgMap = new Map<string, { name: string; total: number; completed: number; inProgress: number; overdue: number }>();

    const defaultOrgs = [
      'Ban Giám hiệu',
      'Tổ Toán - Tin học',
      'Tổ Ngữ văn - Lịch sử - Địa lý',
      'Tổ Tiếng Anh',
      'Tổ KHTN',
      'Tổ Văn phòng - Kế toán',
    ];

    defaultOrgs.forEach((name) => {
      orgMap.set(name, { name, total: 0, completed: 0, inProgress: 0, overdue: 0 });
    });

    tasks.forEach((t) => {
      const orgName = t.orgUnit?.name || 'Ban Giám hiệu';
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, { name: orgName, total: 0, completed: 0, inProgress: 0, overdue: 0 });
      }
      const item = orgMap.get(orgName)!;
      item.total++;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') item.completed++;
      else if (t.status === 'DANG_THUC_HIEN' || t.status === 'DA_TIEP_NHAN' || t.status === 'DA_GIAO') item.inProgress++;
      if (t.isOverdue) item.overdue++;
    });

    const result: BreakdownStatItem[] = [];
    orgMap.forEach((val, key) => {
      const rate = val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0;
      result.push({
        id: key,
        name: val.name,
        total: val.total,
        completed: val.completed,
        inProgress: val.inProgress,
        overdue: val.overdue,
        completionRate: rate,
      });
    });

    return result.sort((a, b) => b.total - a.total);
  }

  /**
   * Xuất file Excel Báo cáo Công việc định dạng chuẩn hành chính ngành Giáo dục
   */
  exportToExcel(
    reportTitle: string,
    filterMeta: { locationName?: string; orgUnitName?: string; planName?: string; timeRangeText?: string; exporterName?: string },
    summaryKpis: ReportSummaryKpis,
    tasks: TaskItem[],
    customFileName?: string
  ) {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = customFileName || `Bao_Cao_Cong_Viec_THCS_Phuoc_Tan_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xls`;

    // Chuẩn hóa tên trạng thái tiếng Việt
    const getStatusText = (status: string) => {
      switch (status) {
        case 'HOAN_THANH': return 'Hoàn thành';
        case 'DANG_THUC_HIEN': return 'Đang thực hiện';
        case 'CHO_KIEM_TRA': return 'Chờ nghiệm thu';
        case 'BO_SUNG': return 'Yêu cầu bổ sung';
        case 'DA_TIEP_NHAN': return 'Đã tiếp nhận';
        case 'DA_GIAO': return 'Đã giao việc';
        case 'DONG': return 'Đã đóng';
        case 'HUY': return 'Đã hủy';
        default: return status;
      }
    };

    const getPriorityText = (priority?: string) => {
      switch (priority) {
        case 'KHAN_CAP': return 'Khẩn cấp';
        case 'CAO': return 'Cao';
        case 'TRUNG_BINH': return 'Trung bình';
        case 'THAP': return 'Thấp';
        default: return 'Bình thường';
      }
    };

    const getDueStatusText = (t: TaskItem) => {
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') return 'Đã hoàn thành';
      if (t.isOverdue) return 'QUÁ HẠN';
      if (!t.dueDate) return 'Đúng tiến độ';
      const d = new Date(t.dueDate);
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (diff <= 3) return 'Sắp đến hạn';
      return 'Trong hạn';
    };

    // Tạo nội dung HTML-XML chuẩn Excel có styling màu sắc, viền ô và font chữ Times New Roman / Segoe UI
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          body { font-family: 'Times New Roman', 'Segoe UI', Tahoma, Arial, sans-serif; }
          .header-table { width: 100%; margin-bottom: 20px; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; color: #1F3864; }
          .subtitle { font-size: 11pt; font-style: italic; text-align: center; color: #475569; }
          .meta-box { font-size: 10pt; margin: 10px 0; color: #334155; }
          .table-kpi { border-collapse: collapse; width: 100%; margin: 15px 0; }
          .table-kpi td, .table-kpi th { border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 10pt; }
          .table-kpi th { background-color: #EEF4FC; color: #1F3864; font-weight: bold; text-align: center; }
          .table-main { border-collapse: collapse; width: 100%; margin-top: 15px; }
          .table-main th { background-color: #1F3864; color: #FFFFFF; font-weight: bold; border: 1px solid #152644; padding: 8px 6px; font-size: 10pt; text-align: center; }
          .table-main td { border: 1px solid #CBD5E1; padding: 6px; font-size: 9.5pt; vertical-align: middle; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .status-completed { color: #15803D; font-weight: bold; }
          .status-overdue { color: #B91C1C; font-weight: bold; }
          .status-review { color: #B45309; font-weight: bold; }
          .status-progress { color: #1E40AF; }
          .footer-sign { width: 100%; margin-top: 30px; }
        </style>
      </head>
      <body>
        <!-- Header Quốc hiệu & Đơn vị -->
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 50%; text-align: center; font-size: 10pt; font-weight: bold;">
              ỦY BAN NHÂN DÂN THÀNH PHỐ BIÊN HÒA<br/>
              <span style="font-weight: bold; color: #1F3864;">TRƯỜNG TH VÀ THCS PHƯỚC TÂN</span><br/>
              ---------------------------
            </td>
            <td style="width: 50%; text-align: center; font-size: 10pt; font-weight: bold;">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>
              <span style="font-weight: normal; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span><br/>
              <span style="font-weight: normal; font-style: italic; font-size: 9pt;">Biên Hòa, ngày ${dateStr}</span>
            </td>
          </tr>
        </table>

        <br/>
        <div class="title">${reportTitle.toUpperCase()}</div>
        <div class="subtitle">Năm học: 2026 - 2027 • Quy mô: 3 Điểm trường • 122 Lớp • 5.669 Học sinh</div>
        <br/>

        <!-- Thông tin bộ lọc & Thời gian xuất -->
        <table class="meta-box" style="width: 100%; border: none;">
          <tr>
            <td><strong>• Phạm vi điểm trường:</strong> ${filterMeta.locationName || 'Toàn trường (3 Điểm trường)'}</td>
            <td><strong>• Tổ chuyên môn:</strong> ${filterMeta.orgUnitName || 'Tất cả các tổ'}</td>
          </tr>
          <tr>
            <td><strong>• Gắn với kế hoạch:</strong> ${filterMeta.planName || 'Toàn bộ kế hoạch & Việc đột xuất'}</td>
            <td><strong>• Kỳ báo cáo:</strong> ${filterMeta.timeRangeText || 'Toàn bộ thời gian'}</td>
          </tr>
          <tr>
            <td><strong>• Người lập báo cáo:</strong> ${filterMeta.exporterName || 'Ban Giám hiệu'}</td>
            <td><strong>• Thời điểm xuất dữ liệu:</strong> ${timeStr} ngày ${dateStr}</td>
          </tr>
        </table>

        <br/>
        <!-- Khối Bảng Thống kê Tổng hợp KPI -->
        <h3 style="color: #1F3864; font-size: 11pt; margin-bottom: 5px;">I. TỔNG HỢP CHỈ SỐ TIẾN ĐỘ THỰC HIỆN</h3>
        <table class="table-kpi">
          <tr>
            <th>Tổng số công việc</th>
            <th>Đã hoàn thành</th>
            <th>Đang thực hiện</th>
            <th>Chờ nghiệm thu</th>
            <th>Quá hạn</th>
            <th>Tỷ lệ hoàn thành</th>
          </tr>
          <tr>
            <td class="text-center font-bold" style="font-size: 12pt; color: #1F3864;">${summaryKpis.totalTasks}</td>
            <td class="text-center font-bold status-completed" style="font-size: 12pt;">${summaryKpis.completedTasks}</td>
            <td class="text-center font-bold status-progress" style="font-size: 12pt;">${summaryKpis.inProgressTasks}</td>
            <td class="text-center font-bold status-review" style="font-size: 12pt;">${summaryKpis.waitingConfirmTasks}</td>
            <td class="text-center font-bold status-overdue" style="font-size: 12pt;">${summaryKpis.overdueTasks}</td>
            <td class="text-center font-bold" style="font-size: 12pt; color: #2E7D32;">${summaryKpis.completionRate}%</td>
          </tr>
        </table>

        <br/>
        <!-- Khối Bảng Chi tiết từng công việc -->
        <h3 style="color: #1F3864; font-size: 11pt; margin-bottom: 5px;">II. DANH SÁCH CHI TIẾT CÁC NHIỆM VỤ & CÔNG VIỆC (${tasks.length} công việc)</h3>
        <table class="table-main">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 85px;">Mã việc</th>
              <th style="width: 250px;">Tên nhiệm vụ / Công việc</th>
              <th style="width: 130px;">Kế hoạch trực thuộc</th>
              <th style="width: 110px;">Điểm trường</th>
              <th style="width: 110px;">Tổ chuyên môn</th>
              <th style="width: 100px;">Chủ trì (R)</th>
              <th style="width: 100px;">Kiểm tra (A)</th>
              <th style="width: 75px;">Hạn chót</th>
              <th style="width: 55px;">Tiến độ</th>
              <th style="width: 90px;">Trạng thái</th>
              <th style="width: 85px;">Tình trạng hạn</th>
            </tr>
          </thead>
          <tbody>
    `;

    tasks.forEach((t, idx) => {
      const chuTri = t.assignments?.find((a) => a.role === 'CHU_TRI')?.user?.fullName || 'Chưa gán';
      const kiemTra = t.assignments?.find((a) => a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET')?.user?.fullName || 'BGH';
      const locName = t.location?.name || 'Điểm chính';
      const orgName = t.orgUnit?.name || 'BGH';
      const planTitle = t.plan?.title || 'Ngoài kế hoạch (Đột xuất)';
      const dueFormatted = t.dueDate ? t.dueDate.slice(0, 10).split('-').reverse().join('/') : 'Không có';
      const statusClass = t.status === 'HOAN_THANH' || t.status === 'DONG' ? 'status-completed' : t.isOverdue ? 'status-overdue' : t.status === 'CHO_KIEM_TRA' ? 'status-review' : 'status-progress';

      excelContent += `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-center font-bold">${t.code || 'CV-' + (idx + 1)}</td>
          <td class="text-left font-bold">${t.title}</td>
          <td class="text-left">${planTitle}</td>
          <td class="text-left">${locName}</td>
          <td class="text-left">${orgName}</td>
          <td class="text-left">${chuTri}</td>
          <td class="text-left">${kiemTra}</td>
          <td class="text-center">${dueFormatted}</td>
          <td class="text-center font-bold">${t.progressPercent || 0}%</td>
          <td class="text-center ${statusClass}">${getStatusText(t.status)}</td>
          <td class="text-center ${t.isOverdue ? 'status-overdue' : ''}">${getDueStatusText(t)}</td>
        </tr>
      `;
    });

    excelContent += `
          </tbody>
        </table>

        <br/><br/>
        <!-- Khối Chữ ký -->
        <table class="footer-sign" style="width: 100%; border: none;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              <span style="font-weight: bold; font-size: 10pt;">NGƯỜI LẬP BÁO CÁO</span><br/>
              <span style="font-style: italic; font-size: 9pt;">(Ký và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              <strong>${filterMeta.exporterName || 'Cán bộ phụ trách'}</strong>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              <span style="font-weight: bold; font-size: 10pt;">HIỆU TRƯỞNG PHÊ DUYỆT</span><br/>
              <span style="font-style: italic; font-size: 9pt;">(Ký, đóng dấu và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              <strong>Cô Phạm Thị Nam</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Tạo Blob và kích hoạt tải về
    const blob = new Blob(['\ufeff' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
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
