import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Role } from '@prisma/client';
import { StorageService } from '../../services/storage.service';

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

    const task = await prisma.task.findUnique({ where: { id: taskId } });
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
}

export const attachmentService = new AttachmentService();
