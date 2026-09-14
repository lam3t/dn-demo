import { Request, Response, NextFunction } from 'express';
import { attachmentService } from './attachment.service';

export class AttachmentController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id || req.params.taskId;
      const uploadedById = req.user!.id;
      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      const { taskLogId } = req.body;

      const attachments = await attachmentService.uploadFiles(taskId, uploadedById, files, taskLogId);

      res.status(201).json({
        success: true,
        message: `Đã tải lên thành công ${attachments.length} tệp đính kèm.`,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByTaskId(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id || req.params.taskId;
      const attachments = await attachmentService.getByTaskId(taskId);
      res.status(200).json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  }

  async getRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin trường học (tenantId).' });
      }

      const { search, mimeType, uploadedById, orgUnitId, locationId, startDate, endDate, page, pageSize } = req.query;

      const result = await attachmentService.getEvidenceRepository({
        tenantId,
        search: search as string,
        mimeType: mimeType as string,
        uploadedById: uploadedById as string,
        orgUnitId: orgUnitId as string,
        locationId: locationId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRoles = req.user!.roles.map((r) => r.role);

      const result = await attachmentService.delete(id, userId, userRoles);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const attachmentController = new AttachmentController();

