import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Role, NotificationType, TaskAssignmentRole } from '@prisma/client';
import { StorageService } from '../../services/storage.service';
import { QueueService } from '../../services/queue.service';

export class AttachmentService {
  async uploadFiles(
    taskId: string,
    uploadedById: string,
    files: Express.Multer.File[],
    taskLogId?: string
  ) {
    if (!files || files.length === 0) {
      throw new AppError('Không có tệp nào được tải lên.', 400);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new AppError('Không tìm thấy công việc để đính kèm tệp.', 404);
    }

    const createdAttachments = [];

    for (const f of files) {
      // Lưu qua StorageService theo phân tầng tenant
      const storageResult = await StorageService.saveTaskEvidence(task.tenantId, taskId, f);

      const attachment = await prisma.attachment.create({
        data: {
          tenantId: task.tenantId,
          taskId,
          taskLogId: taskLogId || null,
          uploadedById,
          fileName: storageResult.fileName,
          originalName: storageResult.fileName,
          fileUrl: storageResult.fileUrl,
          fileSize: storageResult.fileSize,
          mimeType: storageResult.mimeType,
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      });

      createdAttachments.push(attachment);
    }

    // Ghi nhật ký vào TaskLog
    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId: uploadedById,
        action: 'DINH_KEM_MINH_CHUNG',
        note: `Đã tải lên ${files.length} tệp minh chứng: ${files.map((f) => f.originalname).join(', ')}`,
      },
    });

    // Bắn thông báo nộp minh chứng
    let uploaderName = 'Người thực hiện';
    if (uploadedById && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uploadedById)) {
      try {
        const uploader = await prisma.user.findUnique({ where: { id: uploadedById }, select: { fullName: true } });
        if (uploader?.fullName) uploaderName = uploader.fullName;
      } catch (_) {}
    }
    const notifyTargets = new Set<string>();
    if (task.createdById) notifyTargets.add(task.createdById);
    task.assignments
      .filter((a) => a.role === TaskAssignmentRole.KIEM_TRA || a.role === TaskAssignmentRole.PHE_DUYET)
      .forEach((a) => notifyTargets.add(a.userId));
    notifyTargets.delete(uploadedById);

    for (const targetUserId of notifyTargets) {
      await QueueService.pushNotification({
        tenantId: task.tenantId,
        userId: targetUserId,
        type: NotificationType.HE_THONG,
        title: `Nộp minh chứng mới: ${task.title}`,
        content: `${uploaderName} đã tải lên ${files.length} tệp minh chứng kết quả công việc.`,
        link: `/tasks/${taskId}`,
      });
    }

    return createdAttachments;
  }

  async getByTaskId(taskId: string) {
    return prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, title: true, avatarUrl: true },
        },
      },
    });
  }

  async delete(id: string, userId: string, userRoles: Role[]) {
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new AppError('Không tìm thấy tệp đính kèm.', 404);
    }

    const isUploader = attachment.uploadedById === userId;
    const isManager = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.HIEU_TRUONG);

    if (!isUploader && !isManager) {
      throw new AppError('Bạn không có quyền xóa tệp đính kèm này.', 403);
    }

    // Xóa file vật lý qua StorageService nếu có fileUrl
    if (attachment.fileUrl.startsWith('/uploads/')) {
      const relativeKey = attachment.fileUrl.replace('/uploads/', '');
      await StorageService.deleteFile(attachment.tenantId, relativeKey);
    }

    await prisma.attachment.delete({ where: { id } });

    return { success: true, message: 'Xóa tệp đính kèm thành công.' };
  }

  /**
   * Kho minh chứng số tập trung (TT 011, 012, 075, 093)
   */
  async getEvidenceRepository(params: {
    tenantId: string;
    search?: string;
    mimeType?: string;
    uploadedById?: string;
    orgUnitId?: string;
    locationId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const where: any = {
      tenantId: params.tenantId,
    };

    if (params.search && params.search.trim()) {
      where.OR = [
        { fileName: { contains: params.search.trim(), mode: 'insensitive' } },
        { originalName: { contains: params.search.trim(), mode: 'insensitive' } },
        { task: { title: { contains: params.search.trim(), mode: 'insensitive' } } },
      ];
    }

    if (params.mimeType && params.mimeType !== 'ALL') {
      if (params.mimeType === 'IMAGE') {
        where.mimeType = { startsWith: 'image/' };
      } else if (params.mimeType === 'PDF') {
        where.mimeType = 'application/pdf';
      } else if (params.mimeType === 'WORD') {
        where.mimeType = { contains: 'word' };
      } else if (params.mimeType === 'EXCEL') {
        where.mimeType = { contains: 'sheet' };
      } else {
        where.mimeType = { contains: params.mimeType };
      }
    }

    if (params.uploadedById) {
      where.uploadedById = params.uploadedById;
    }

    if (params.locationId) {
      where.task = { ...(where.task || {}), locationId: params.locationId };
    }

    if (params.orgUnitId) {
      where.task = {
        ...(where.task || {}),
        OR: [{ orgUnitId: params.orgUnitId }, { assignedOrgUnitId: params.orgUnitId }],
      };
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [total, items] = await Promise.all([
      prisma.attachment.count({ where }),
      prisma.attachment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, title: true, avatarUrl: true, phone: true },
          },
          task: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              plan: { select: { id: true, title: true } },
              location: { select: { id: true, name: true } },
              orgUnit: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

export const attachmentService = new AttachmentService();

