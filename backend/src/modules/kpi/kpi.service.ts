import { prisma } from '../../prisma';
import ExcelJS from 'exceljs';

export interface UserKpiDetail {
  record: any;
  manualScores?: any;
  calculatedSummary?: any;
  user: {
    id: string;
    fullName: string;
    title: string | null;
    email: string;
    phone: string;
    orgUnitName?: string;
    locationName?: string;
  };
  taskBreakdown: {
    total: number;
    completedBeforeDeadline: number;
    completedOnTime: number;
    completedLate: number;
    uncompleted: number;
  };
  scores: {
    scoreA_Quantity: number;
    scoreB_Quality: number;
    scoreC_Timeline: number;
    scoreD_Leadership: number;
    finalScore: number;
    rating: string;
    ratingCategory: string;
    ratingColor: string;
  };
  tasks: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    progressPercent: number;
    dueDate: Date | null;
    completedAt: Date | null;
    evaluationRating: string | null;
    timingCategory: 'BEFORE_DEADLINE' | 'ON_TIME' | 'LATE' | 'UNCOMPLETED';
    weight: number;
  }>;
}

export class KpiService {
  /**
   * Tính toán và lưu trữ bảng điểm KPI cho một người dùng theo kỳ
   */
  static async calculateUserKpi(
    tenantId: string,
    userId: string,
    periodKey: string = 'QUY_3',
    periodType: string = 'QUY',
    schoolYear: string = '2026-2027'
  ): Promise<UserKpiDetail> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        primaryOrgUnit: true,
        primaryLocation: true,
      },
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại trong trường học hiện hành');
    }

    // 1. Quét tất cả công việc mà người dùng được phân công thực hiện trong tenant
    const assignments = await prisma.taskAssignment.findMany({
      where: {
        tenantId,
        userId,
      },
      include: {
        task: {
          include: {
            plan: true,
            orgUnit: true,
            location: true,
          },
        },
      },
    });

    const tasksFromAssignments = assignments.map((a) => a.task).filter(Boolean);

    // Cũng lấy các task do chính người dùng tự tạo mà chưa gán cho ai khác
    const unassignedTasks = await prisma.task.findMany({
      where: {
        tenantId,
        createdById: userId,
        assignments: { none: {} },
      },
      include: {
        plan: true,
        orgUnit: true,
        location: true,
      },
    });

    // Gom danh sách task duy nhất
    const taskMap = new Map<string, typeof unassignedTasks[0]>();
    for (const t of [...tasksFromAssignments, ...unassignedTasks]) {
      taskMap.set(t.id, t);
    }
    const allTasks = Array.from(taskMap.values());

    // 2. Phân loại tiến độ và chất lượng từng công việc
    let completedBeforeDeadline = 0;
    let completedOnTime = 0;
    let completedLate = 0;
    let uncompleted = 0;

    let totalWeight = 0;
    let totalActualWeighted = 0;
    let totalQualityWeighted = 0;
    let totalTimelineWeighted = 0;
    let totalLeadershipWeighted = 0;

    const taskItems = allTasks.map((t) => {
      let weight = 1.0;
      if (t.priority === 'KHAN_CAP') weight = 2.0;
      else if (t.priority === 'CAO') weight = 1.5;

      totalWeight += weight;

      const isCompleted = t.status === 'HOAN_THANH' || t.status === 'DONG' || t.status === 'XAC_NHAN';
      let timingCategory: 'BEFORE_DEADLINE' | 'ON_TIME' | 'LATE' | 'UNCOMPLETED' = 'UNCOMPLETED';

      let actualVal = 0.5;
      let qualityScore = 75;
      let timelineScore = 70;
      const leadershipScore = 95;

      if (isCompleted) {
        actualVal = 1.0;
        if (t.completedAt && t.dueDate) {
          const compTime = new Date(t.completedAt).getTime();
          const dueTime = new Date(t.dueDate).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (compTime < dueTime - oneDayMs) {
            timingCategory = 'BEFORE_DEADLINE';
            completedBeforeDeadline++;
            timelineScore = 100;
          } else if (compTime <= dueTime + oneDayMs) {
            timingCategory = 'ON_TIME';
            completedOnTime++;
            timelineScore = 95;
          } else {
            timingCategory = 'LATE';
            completedLate++;
            timelineScore = 65;
          }
        } else {
          timingCategory = 'ON_TIME';
          completedOnTime++;
          timelineScore = 95;
        }

        // Chất lượng
        if (t.evaluationRating === 'XUAT_SAC') qualityScore = 100;
        else if (t.evaluationRating === 'TOT') qualityScore = 90;
        else if (t.evaluationRating === 'HOAN_THANH') qualityScore = 80;
        else if (t.evaluationRating === 'CHUA_DAT') qualityScore = 50;
        else qualityScore = 88;
      } else {
        timingCategory = 'UNCOMPLETED';
        uncompleted++;
        actualVal = t.progressPercent >= 50 ? t.progressPercent / 100 : 0.4;
        qualityScore = 70;
        const now = new Date().getTime();
        const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : now + 10000;
        timelineScore = now > dueTime ? 45 : 75;
      }

      const actualWeighted = actualVal * weight;
      const qualityWeighted = (qualityScore / 100) * weight;
      const timelineWeighted = (timelineScore / 100) * weight;
      const leadershipWeighted = (leadershipScore / 100) * weight;

      totalActualWeighted += actualWeighted;
      totalQualityWeighted += qualityWeighted;
      totalTimelineWeighted += timelineWeighted;
      totalLeadershipWeighted += leadershipWeighted;

      return {
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        progressPercent: t.progressPercent,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        evaluationRating: t.evaluationRating,
        timingCategory,
        weight,
      };
    });

    const totalTasks = allTasks.length;

    // 3. Tính điểm 4 trụ cột A, B, C, D
    const scoreA_Quantity = totalWeight > 0 ? Math.min(100, Math.round((totalActualWeighted / totalWeight) * 10000) / 100) : 100;
    const scoreB_Quality = totalWeight > 0 ? Math.min(100, Math.round((totalQualityWeighted / totalWeight) * 10000) / 100) : 90;
    const scoreC_Timeline = totalWeight > 0 ? Math.min(100, Math.round((totalTimelineWeighted / totalWeight) * 10000) / 100) : 95;
    const scoreD_Leadership = totalWeight > 0 ? Math.min(100, Math.round((totalLeadershipWeighted / totalWeight) * 10000) / 100) : 95;

    const finalScore = Math.round(((scoreA_Quantity + scoreB_Quality + scoreC_Timeline + scoreD_Leadership) / 4) * 100) / 100;

    let rating = 'HOAN_THANH';
    let ratingCategory = 'Hoàn thành nhiệm vụ (Loại C)';
    let ratingColor = '#D97706';

    if (finalScore >= 90) {
      rating = 'XUAT_SAC';
      ratingCategory = 'Hoàn thành xuất sắc nhiệm vụ (Loại A)';
      ratingColor = '#16A34A';
    } else if (finalScore >= 80) {
      rating = 'TOT';
      ratingCategory = 'Hoàn thành tốt nhiệm vụ (Loại B)';
      ratingColor = '#2563EB';
    } else if (finalScore < 65) {
      rating = 'CHUA_DAT';
      ratingCategory = 'Không hoàn thành nhiệm vụ (Loại D)';
      ratingColor = '#DC2626';
    }

    // 4. Lưu / Cập nhật vào KPIRecord
    const record = await prisma.kPIRecord.upsert({
      where: {
        tenantId_userId_periodKey: {
          tenantId,
          userId,
          periodKey,
        },
      },
      create: {
        tenantId,
        userId,
        periodType,
        periodKey,
        schoolYear,
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        taskDetails: taskItems as any,
        calculatedBy: 'SYSTEM',
        calculatedAt: new Date(),
      },
      update: {
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        taskDetails: taskItems as any,
        calculatedBy: 'SYSTEM',
        calculatedAt: new Date(),
      },
    });

    return {
      record,
      manualScores: record.manualScores || {},
      calculatedSummary: {
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA: scoreA_Quantity,
        scoreB: scoreB_Quality,
        scoreC: scoreC_Timeline,
        scoreD: scoreD_Leadership,
        finalScore,
        finalGrade: rating,
        ratingCategory,
      },
      user: {
        id: user.id,
        fullName: user.fullName,
        title: user.title,
        email: user.email,
        phone: user.phone,
        orgUnitName: user.primaryOrgUnit?.name,
        locationName: user.primaryLocation?.name,
      },
      taskBreakdown: {
        total: totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompleted,
      },
      scores: {
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        ratingCategory,
        ratingColor,
      },
      tasks: taskItems,
    };
  }

  /**
   * Tính lại toàn bộ KPI cho mọi nhân sự trong trường
   */
  static async recomputeTenantKpi(
    tenantId: string,
    periodKey: string = 'QUY_3',
    periodType: string = 'QUY',
    schoolYear: string = '2026-2027'
  ): Promise<{ processedUsers: number; summary: any }> {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, fullName: true },
    });

    let totalScore = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let completeCount = 0;
    let failedCount = 0;

    // Tối ưu hóa: Chạy song song theo lô 10 nhân sự để tăng tốc độ gấp 10 lần
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchRes = await Promise.all(
        batch.map((u) => this.calculateUserKpi(tenantId, u.id, periodKey, periodType, schoolYear))
      );

      for (const res of batchRes) {
        totalScore += res.scores.finalScore;
        if (res.scores.rating === 'XUAT_SAC') excellentCount++;
        else if (res.scores.rating === 'TOT') goodCount++;
        else if (res.scores.rating === 'HOAN_THANH') completeCount++;
        else failedCount++;
      }
    }

    const processedUsers = users.length;
    const avgScore = processedUsers > 0 ? Math.round((totalScore / processedUsers) * 100) / 100 : 0;

    return {
      processedUsers,
      summary: {
        periodKey,
        avgScore,
        excellentCount,
        goodCount,
        completeCount,
        failedCount,
      },
    };
  }

  /**
   * Lấy tổng hợp KPI của một Tổ chuyên môn / Bộ phận
   */
  static async getOrgUnitKpiSummary(tenantId: string, orgUnitId: string, periodKey: string = 'QUY_3') {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, fullName: true, title: true, avatarUrl: true },
        },
      },
    });

    if (!orgUnit) {
      throw new Error('Tổ chuyên môn không tồn tại');
    }

    const memberKpis: any[] = [];
    let totalScore = 0;
    let totalTasks = 0;
    let totalCompleted = 0;

    for (const u of orgUnit.users) {
      let record = await prisma.kPIRecord.findUnique({
        where: {
          tenantId_userId_periodKey: {
            tenantId,
            userId: u.id,
            periodKey,
          },
        },
      });

      if (!record) {
        const calc = await this.calculateUserKpi(tenantId, u.id, periodKey);
        record = calc.record;
      }

      if (record) {
        totalScore += record.finalScore;
        totalTasks += record.totalTasks;
        totalCompleted += record.completedBeforeDeadline + record.completedOnTime + record.completedLate;

        memberKpis.push({
          userId: u.id,
          fullName: u.fullName,
          title: u.title,
          avatarUrl: u.avatarUrl,
          finalScore: record.finalScore,
          rating: record.rating,
          totalTasks: record.totalTasks,
          completed: record.completedBeforeDeadline + record.completedOnTime + record.completedLate,
          uncompleted: record.uncompletedTasks,
        });
      }
    }

    const memberCount = orgUnit.users.length;
    const avgScore = memberCount > 0 ? Math.round((totalScore / memberCount) * 100) / 100 : 0;

    return {
      orgUnit: {
        id: orgUnit.id,
        name: orgUnit.name,
        code: orgUnit.code,
      },
      periodKey,
      stats: {
        memberCount,
        avgScore,
        totalTasks,
        totalCompleted,
        completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      },
      members: memberKpis,
    };
  }

  /**
   * Lấy tổng hợp KPI toàn trường (theo phân hiệu và tổ)
   */
  static async getSchoolKpiSummary(tenantId: string, periodKey: string = 'QUY_3') {
    const school = await prisma.school.findFirst({
      where: { tenantId },
      include: {
        locations: true,
        orgUnits: true,
      },
    });

    const records = await prisma.kPIRecord.findMany({
      where: { tenantId, periodKey },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            title: true,
            primaryLocationId: true,
            primaryOrgUnitId: true,
          },
        },
      },
    });

    let totalScore = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let completeCount = 0;
    let failedCount = 0;

    for (const r of records) {
      totalScore += r.finalScore;
      if (r.rating === 'XUAT_SAC') excellentCount++;
      else if (r.rating === 'TOT') goodCount++;
      else if (r.rating === 'HOAN_THANH') completeCount++;
      else failedCount++;
    }

    const totalStaff = records.length;
    const avgScore = totalStaff > 0 ? Math.round((totalScore / totalStaff) * 100) / 100 : 0;

    return {
      schoolName: school?.name || 'Trường học',
      periodKey,
      overall: {
        totalStaff,
        avgScore,
        ratingDistribution: {
          excellent: excellentCount,
          good: goodCount,
          complete: completeCount,
          failed: failedCount,
        },
      },
      records: records.map((r) => ({
        userId: r.userId,
        fullName: r.user?.fullName,
        title: r.user?.title,
        locationId: r.user?.primaryLocationId,
        orgUnitId: r.user?.primaryOrgUnitId,
        finalScore: r.finalScore,
        rating: r.rating,
        totalTasks: r.totalTasks,
        scoreA: r.scoreA_Quantity,
        scoreB: r.scoreB_Quality,
        scoreC: r.scoreC_Timeline,
        scoreD: r.scoreD_Leadership,
      })),
    };
  }

  /**
   * Kết xuất file Excel bảng điểm KPI chuẩn
   */
  static async exportKpiExcel(tenantId: string, periodKey: string = 'QUY_3', userId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TN EDU SaaS Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng tính KPI Cá nhân');

    // Thiết lập cấu hình in ấn
    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    let kpiData: UserKpiDetail;
    if (userId) {
      kpiData = await this.calculateUserKpi(tenantId, userId, periodKey);
    } else {
      const firstUser = await prisma.user.findFirst({ where: { tenantId, isActive: true } });
      if (!firstUser) throw new Error('Không tìm thấy người dùng');
      kpiData = await this.calculateUserKpi(tenantId, firstUser.id, periodKey);
    }

    // Tiêu ngữ & Header
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'TRƯỜNG TH & THCS PHƯỚC TÂN';
    sheet.getCell('A1').font = { bold: true, size: 10 };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `Tổ chuyên môn: ${kpiData.user.orgUnitName || 'Ban Giám hiệu'}`;
    sheet.getCell('A2').font = { italic: true, size: 9 };

    sheet.mergeCells('I1:O1');
    sheet.getCell('I1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    sheet.getCell('I1').font = { bold: true, size: 10 };
    sheet.getCell('I1').alignment = { horizontal: 'center' };

    sheet.mergeCells('I2:O2');
    sheet.getCell('I2').value = 'Độc lập - Tự do - Hạnh phúc';
    sheet.getCell('I2').font = { bold: true, underline: true, size: 10 };
    sheet.getCell('I2').alignment = { horizontal: 'center' };

    // Tiêu đề chính
    sheet.mergeCells('A4:O4');
    sheet.getCell('A4').value = 'BẢNG ĐÁNH GIÁ VÀ TÍNH ĐIỂM KPI CÁ NHÂN';
    sheet.getCell('A4').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
    sheet.getCell('A4').alignment = { horizontal: 'center' };

    sheet.mergeCells('A5:O5');
    sheet.getCell('A5').value = `Kỳ đánh giá: ${periodKey} • Họ và tên: ${kpiData.user.fullName} (${kpiData.user.title || 'Cán bộ'})`;
    sheet.getCell('A5').font = { italic: true, size: 10 };
    sheet.getCell('A5').alignment = { horizontal: 'center' };

    // Bảng dữ liệu chính
    sheet.getRow(7).values = [
      'STT',
      'Nhiệm vụ theo kỳ',
      'Độ ưu tiên',
      'Trạng thái',
      'Hạn chót',
      'Hệ số',
      'Quy đổi KH',
      'Thực tế',
      'Quy đổi SL',
      'Chất lượng',
      'Quy đổi CL',
      'Tiến độ',
      'Quy đổi TĐ',
      'Điều hành',
      'Quy đổi ĐH',
    ];

    sheet.getRow(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(7).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 15; c++) {
      const cell = sheet.getRow(7).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' },
      };
    }

    let rowIndex = 8;
    kpiData.tasks.forEach((t, idx) => {
      const row = sheet.getRow(rowIndex);
      row.values = [
        idx + 1,
        t.title,
        t.priority,
        t.status,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Trong kỳ',
        t.weight,
        t.weight,
        t.status === 'HOAN_THANH' ? '1' : `${t.progressPercent}%`,
        t.status === 'HOAN_THANH' ? t.weight : Math.round(t.weight * (t.progressPercent / 100) * 10) / 10,
        t.evaluationRating || 'Đạt chuẩn',
        t.weight,
        t.timingCategory,
        t.weight,
        'Tốt',
        t.weight,
      ];
      row.alignment = { vertical: 'middle' };
      rowIndex++;
    });

    // Dòng tổng kết điểm
    rowIndex += 2;
    sheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
    sheet.getCell(`A${rowIndex}`).value = 'KẾT QUẢ ĐÁNH GIÁ KPI TỔNG HỢP';
    sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    const scoreRows = [
      ['KPI Số lượng (A)', kpiData.scores.scoreA_Quantity],
      ['KPI Chất lượng (B)', kpiData.scores.scoreB_Quality],
      ['KPI Tiến độ (C)', kpiData.scores.scoreC_Timeline],
      ['KPI Điều hành / Phối hợp (D)', kpiData.scores.scoreD_Leadership],
      ['TỔNG ĐIỂM KPI (NV1)', kpiData.scores.finalScore],
      ['XẾP LOẠI', kpiData.scores.ratingCategory],
    ];

    scoreRows.forEach(([label, val]) => {
      rowIndex++;
      sheet.getCell(`A${rowIndex}`).value = label;
      sheet.getCell(`A${rowIndex}`).font = { bold: true };
      sheet.getCell(`E${rowIndex}`).value = val;
      sheet.getCell(`E${rowIndex}`).font = { bold: true };
      sheet.getCell(`E${rowIndex}`).alignment = { horizontal: 'right' };
    });

    // Căn chỉnh độ rộng cột
    sheet.columns = [
      { width: 6 },
      { width: 35 },
      { width: 14 },
      { width: 15 },
      { width: 13 },
      { width: 8 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 16 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(rawBuffer);
  }

  /**
   * Cập nhật điểm tự đánh giá KPI thủ công (TT 120)
   */
  static async updateManualScore(
    tenantId: string,
    userId: string,
    payload: {
      periodKey?: string;
      kpiCode: string;
      score: number;
      note?: string;
    }
  ) {
    const periodKey = payload.periodKey || 'QUY_3';
    let record = await prisma.kPIRecord.findUnique({
      where: {
        tenantId_userId_periodKey: {
          tenantId,
          userId,
          periodKey,
        },
      },
    });

    if (!record) {
      await this.calculateUserKpi(tenantId, userId, periodKey);
      record = await prisma.kPIRecord.findUnique({
        where: {
          tenantId_userId_periodKey: {
            tenantId,
            userId,
            periodKey,
          },
        },
      });
    }

    const currentManualScores: any = (record?.manualScores as any) || {};
    currentManualScores[payload.kpiCode] = {
      score: Number(payload.score),
      note: payload.note || '',
      updatedAt: new Date(),
    };

    const updated = await prisma.kPIRecord.update({
      where: { id: record!.id },
      data: {
        manualScores: currentManualScores,
      },
    });

    return updated;
  }
}

