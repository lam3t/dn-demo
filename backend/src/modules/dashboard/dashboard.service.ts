import prisma from '../../prisma';
import { TaskStatus, TaskPriority, TaskAssignmentRole } from '@prisma/client';
import appCache from '../../utils/cache';

export class DashboardService {
  async getOverview(params: {
    schoolId?: string;
    locationId?: string;
    orgUnitId?: string;
  }) {
    const cacheKey = `dashboard:${params.schoolId || 'all'}:${params.locationId || 'all'}:${params.orgUnitId || 'all'}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};
    if (params.schoolId) where.schoolId = params.schoolId;
    if (params.locationId) where.locationId = params.locationId;
    if (params.orgUnitId) where.orgUnitId = params.orgUnitId;

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const completedStatuses: TaskStatus[] = [
      TaskStatus.HOAN_THANH,
      TaskStatus.XAC_NHAN,
      TaskStatus.DONG,
    ];

    const inProgressStatuses: TaskStatus[] = [
      TaskStatus.DA_GIAO,
      TaskStatus.DA_TIEP_NHAN,
      TaskStatus.DANG_THUC_HIEN,
    ];

    const pendingReviewStatuses: TaskStatus[] = [
      TaskStatus.CHO_KIEM_TRA,
      TaskStatus.BO_SUNG,
    ];

    // 1. Lấy song song dữ liệu tasks, locations và orgUnits
    const [allTasks, allSchoolTasks, locations, orgUnits] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, code: true } },
          orgUnit: { select: { id: true, name: true, code: true } },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  title: true,
                  phone: true,
                  avatarUrl: true,
                  primaryLocation: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.findMany({
        where: params.schoolId ? { schoolId: params.schoolId } : {},
        select: {
          id: true,
          status: true,
          dueDate: true,
          locationId: true,
          orgUnitId: true,
        },
      }),
      prisma.location.findMany({
        where: params.schoolId ? { schoolId: params.schoolId } : {},
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      }),
      prisma.orgUnit.findMany({
        where: params.schoolId ? { schoolId: params.schoolId } : {},
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const totalTasks = allTasks.length;

    // 2. Thống kê theo từng trạng thái
    const byStatus: Record<TaskStatus, number> = {
      NHAP: 0,
      DA_GIAO: 0,
      DA_TIEP_NHAN: 0,
      DANG_THUC_HIEN: 0,
      CHO_KIEM_TRA: 0,
      BO_SUNG: 0,
      HOAN_THANH: 0,
      XAC_NHAN: 0,
      DONG: 0,
      TAM_DUNG: 0,
      HUY: 0,
    };

    let overdueCount = 0;

    allTasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      const isTaskOverdue =
        Boolean(t.dueDate && new Date(t.dueDate) < now) &&
        !completedStatuses.includes(t.status) &&
        t.status !== TaskStatus.HUY;

      if (isTaskOverdue) {
        overdueCount += 1;
      }
    });

    // 3. Danh sách "Việc cần quan tâm" (Quá hạn / Sắp hạn 3 ngày / Bị trả lại / Chờ kiểm tra)
    const attentionTasks: any[] = [];

    allTasks.forEach((t) => {
      if (t.status === TaskStatus.DONG || t.status === TaskStatus.HUY) return;

      const isTaskOverdue = Boolean(t.dueDate && new Date(t.dueDate) < now) && !completedStatuses.includes(t.status);
      const isDueSoon =
        Boolean(t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= threeDaysLater) &&
        !completedStatuses.includes(t.status);
      const isRejected = t.status === TaskStatus.BO_SUNG;
      const isPendingReview = t.status === TaskStatus.CHO_KIEM_TRA;

      let reason = '';
      let priorityLevel = 0;

      if (isTaskOverdue) {
        const daysOver = Math.max(1, Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 3600 * 24)));
        reason = `Đã quá hạn ${daysOver} ngày`;
        priorityLevel = 4;
      } else if (isRejected) {
        reason = 'Bị trả lại — Cần bổ sung minh chứng';
        priorityLevel = 3;
      } else if (isPendingReview) {
        reason = 'Đang chờ Ban Giám hiệu / Tổ trưởng kiểm tra';
        priorityLevel = 2;
      } else if (isDueSoon) {
        const daysLeft = Math.max(0, Math.ceil((new Date(t.dueDate!).getTime() - now.getTime()) / (1000 * 3600 * 24)));
        reason = daysLeft === 0 ? 'Hạn chót hôm nay' : `Sắp đến hạn trong ${daysLeft} ngày`;
        priorityLevel = 1;
      }

      if (reason) {
        const chuTriAssignment = t.assignments.find((a) => a.role === TaskAssignmentRole.CHU_TRI);
        const chuTriUser = chuTriAssignment?.user;

        attentionTasks.push({
          id: t.id,
          code: t.code,
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          progressPercent: t.progressPercent,
          locationName: t.location?.name || 'Toàn trường',
          orgUnitName: t.orgUnit?.name || 'Chung',
          chuTri: chuTriUser
            ? {
                id: chuTriUser.id,
                fullName: chuTriUser.fullName,
                title: chuTriUser.title,
                phone: chuTriUser.phone,
                avatarUrl: chuTriUser.avatarUrl,
                locationName: chuTriUser.primaryLocation?.name,
              }
            : null,
          reason,
          priorityLevel,
        });
      }
    });

    // Sắp xếp việc cần quan tâm: Mức ưu tiên cao nhất trước -> Đến hạn gần nhất
    attentionTasks.sort((a, b) => {
      if (b.priorityLevel !== a.priorityLevel) {
        return b.priorityLevel - a.priorityLevel;
      }
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });

    // 4. Phân tích theo Điểm trường (Breakdown by Location)
    const breakdownByLocation = locations.map((loc) => {
      const locTasks = allSchoolTasks.filter(
        (t) => t.locationId === loc.id && (!params.orgUnitId || t.orgUnitId === params.orgUnitId)
      );
      const totalLoc = locTasks.length;

      const completed = locTasks.filter((t) => completedStatuses.includes(t.status)).length;
      const inProgress = locTasks.filter((t) => inProgressStatuses.includes(t.status)).length;
      const pendingReview = locTasks.filter((t) => pendingReviewStatuses.includes(t.status)).length;
      const overdue = locTasks.filter(
        (t) =>
          Boolean(t.dueDate && new Date(t.dueDate) < now) &&
          !completedStatuses.includes(t.status) &&
          t.status !== TaskStatus.HUY
      ).length;

      const completionRate = totalLoc > 0 ? Math.round((completed / totalLoc) * 100) : 0;

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        isMain: loc.isMain,
        totalTasks: totalLoc,
        completedTasks: completed,
        inProgressTasks: inProgress,
        pendingReviewTasks: pendingReview,
        overdueTasks: overdue,
        completionRate,
      };
    });

    // 5. Phân tích theo Tổ chuyên môn (Breakdown by OrgUnit)
    const breakdownByOrgUnit = orgUnits.map((org) => {
      const orgTasks = allSchoolTasks.filter(
        (t) => t.orgUnitId === org.id && (!params.locationId || t.locationId === params.locationId)
      );
      const totalOrg = orgTasks.length;

      const completed = orgTasks.filter((t) => completedStatuses.includes(t.status)).length;
      const inProgress = orgTasks.filter((t) => inProgressStatuses.includes(t.status)).length;
      const pendingReview = orgTasks.filter((t) => pendingReviewStatuses.includes(t.status)).length;
      const overdue = orgTasks.filter(
        (t) =>
          Boolean(t.dueDate && new Date(t.dueDate) < now) &&
          !completedStatuses.includes(t.status) &&
          t.status !== TaskStatus.HUY
      ).length;

      const completionRate = totalOrg > 0 ? Math.round((completed / totalOrg) * 100) : 0;

      return {
        id: org.id,
        name: org.name,
        code: org.code,
        totalTasks: totalOrg,
        completedTasks: completed,
        inProgressTasks: inProgress,
        pendingReviewTasks: pendingReview,
        overdueTasks: overdue,
        completionRate,
      };
    });

    const result = {
      totalTasks,
      byStatus,
      overdueCount,
      completedCount:
        byStatus[TaskStatus.HOAN_THANH] + byStatus[TaskStatus.XAC_NHAN] + byStatus[TaskStatus.DONG],
      inProgressCount:
        byStatus[TaskStatus.DA_GIAO] + byStatus[TaskStatus.DA_TIEP_NHAN] + byStatus[TaskStatus.DANG_THUC_HIEN],
      pendingReviewCount: byStatus[TaskStatus.CHO_KIEM_TRA] + byStatus[TaskStatus.BO_SUNG],
      attentionTasks: attentionTasks.slice(0, 15),
      breakdownByLocation,
      breakdownByOrgUnit,
    };

    appCache.set(cacheKey, result, 15, ['dashboard', 'tasks']);
    return result;
  }
}

export const dashboardService = new DashboardService();
