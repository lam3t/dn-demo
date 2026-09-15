import prisma from '../../prisma';
import ExcelJS from 'exceljs';

export interface ReportFilterParams {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
  orgUnitId?: string;
  status?: string;
  planId?: string;
}

export class ReportService {
  /**
   * Báo cáo tổng hợp số liệu theo kỳ và đơn vị
   */
  public static async getPeriodSummary(params: ReportFilterParams) {
    const { tenantId, startDate, endDate, locationId, orgUnitId, status, planId } = params;

    const where: any = { tenantId };

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = startDate;
      if (endDate) where.dueDate.lte = endDate;
    }

    if (locationId) where.locationId = locationId;
    if (orgUnitId) where.orgUnitId = orgUnitId;
    if (status && status !== 'ALL') where.status = status;
    if (planId) where.planId = planId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        orgUnit: { select: { id: true, name: true } },
        assignedOrgUnit: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length;
    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'HOAN_THANH' || t.status === 'DONG' || t.status === 'HUY') return false;
      return t.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    const inProgressTasks = tasks.filter((t) => t.status === 'DANG_THUC_HIEN' || t.status === 'DA_GIAO' || t.status === 'CHO_KIEM_TRA' || t.status === 'BO_SUNG').length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Phân nhóm theo điểm trường
    const locationStatsMap = new Map<string, { name: string; total: number; completed: number; overdue: number }>();
    // Phân nhóm theo tổ
    const orgStatsMap = new Map<string, { name: string; total: number; completed: number; overdue: number }>();

    for (const t of tasks) {
      const locName = t.location?.name || 'Chung toàn trường';
      const locStat = locationStatsMap.get(locName) || { name: locName, total: 0, completed: 0, overdue: 0 };
      locStat.total += 1;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') locStat.completed += 1;
      if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'HOAN_THANH' && t.status !== 'DONG') locStat.overdue += 1;
      locationStatsMap.set(locName, locStat);

      const orgName = t.assignedOrgUnit?.name || t.orgUnit?.name || 'Khác';
      const orgStat = orgStatsMap.get(orgName) || { name: orgName, total: 0, completed: 0, overdue: 0 };
      orgStat.total += 1;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') orgStat.completed += 1;
      if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'HOAN_THANH' && t.status !== 'DONG') orgStat.overdue += 1;
      orgStatsMap.set(orgName, orgStat);
    }

    return {
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
      },
      byLocation: Array.from(locationStatsMap.values()),
      byOrgUnit: Array.from(orgStatsMap.values()),
      tasks: tasks.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        progressPercent: t.progressPercent,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        evaluationRating: t.evaluationRating,
        locationName: t.location?.name || '',
        orgUnitName: t.assignedOrgUnit?.name || t.orgUnit?.name || '',
        planTitle: t.plan?.title || '',
        assigneeName: t.assignments.find((a) => a.role === 'CHU_TRI')?.user.fullName || '',
      })),
    };
  }

  /**
   * Xuất file Excel báo cáo tiến độ và công việc
   */
  public static async generateExcelReport(params: ReportFilterParams): Promise<ExcelJS.Buffer> {
    const reportData = await this.getPeriodSummary(params);
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      include: { school: true },
    });

    const schoolName = tenant?.school?.name || tenant?.name || 'Trường học';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TN EDU SaaS Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo tiến độ công việc', {
      views: [{ showGridLines: true }],
    });

    // 1. Title Block
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BÁO CÁO TIẾN ĐỘ THỰC HIỆN CÔNG VIỆC VÀ KẾ HOẠCH`;
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1F3864' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:J2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Đơn vị: ${schoolName} — Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`;
    subCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // 2. Summary Block
    sheet.mergeCells('A4:J4');
    const sumTitle = sheet.getCell('A4');
    sumTitle.value = `I. TỔNG HỢP CHỈ SỐ HOÀN THÀNH: Tổng số việc: ${reportData.summary.totalTasks} | Hoàn thành: ${reportData.summary.completedTasks} (${reportData.summary.completionRate}%) | Đang thực hiện: ${reportData.summary.inProgressTasks} | Quá hạn: ${reportData.summary.overdueTasks}`;
    sumTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sheet.getRow(4).height = 22;

    // 3. Table Headers
    const headerRow = sheet.getRow(6);
    headerRow.values = [
      'STT',
      'Mã CV',
      'Tên công việc',
      'Kế hoạch',
      'Tổ / Đơn vị',
      'Điểm trường',
      'Người chủ trì',
      'Hạn hoàn thành',
      'Tiến độ',
      'Trạng thái',
    ];
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 4. Data Rows
    sheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'code', width: 12 },
      { key: 'title', width: 38 },
      { key: 'plan', width: 28 },
      { key: 'orgUnit', width: 20 },
      { key: 'location', width: 20 },
      { key: 'assignee', width: 20 },
      { key: 'dueDate', width: 15 },
      { key: 'progress', width: 12 },
      { key: 'status', width: 16 },
    ];

    const statusMap: Record<string, string> = {
      NHAP: 'Bản nháp',
      DA_GIAO: 'Đã giao việc',
      DA_TIEP_NHAN: 'Đã tiếp nhận',
      DANG_THUC_HIEN: 'Đang thực hiện',
      CHO_KIEM_TRA: 'Chờ kiểm tra',
      BO_SUNG: 'Yêu cầu bổ sung',
      HOAN_THANH: 'Hoàn thành',
      XAC_NHAN: 'Đã xác nhận',
      DONG: 'Đã đóng',
      TAM_DUNG: 'Tạm dừng',
      HUY: 'Đã hủy',
    };

    reportData.tasks.forEach((task, index) => {
      const row = sheet.addRow({
        stt: index + 1,
        code: task.code || `CV-${task.id.slice(0, 5)}`,
        title: task.title,
        plan: task.planTitle || '—',
        orgUnit: task.orgUnitName || '—',
        location: task.locationName || 'Chung',
        assignee: task.assigneeName || '—',
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '—',
        progress: `${task.progressPercent}%`,
        status: statusMap[task.status] || task.status,
      });

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (colNumber === 1 || colNumber === 2 || colNumber === 8 || colNumber === 9 || colNumber === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
  }
}
