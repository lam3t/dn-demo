import { Request, Response, NextFunction } from 'express';
import { documentService } from './document.service';

export class DocumentController {
  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const academicYear = (req.query.academicYear as string) || (req as any).academicYear || '2026-2027';
      const tree = await documentService.getTree(tenantId, academicYear);
      res.status(200).json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  }

  async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { name, parentId, academicYear } = req.body;
      const folder = await documentService.createFolder(tenantId, { name, parentId, academicYear });
      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  async updateFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { id } = req.params;
      const { name } = req.body;
      const folder = await documentService.updateFolder(tenantId, id, name);
      res.status(200).json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  async deleteFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { id } = req.params;
      const result = await documentService.deleteFolder(tenantId, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getFilesByFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { folderId } = req.params;
      const search = req.query.search as string;
      const files = await documentService.getFilesByFolder(tenantId, folderId, search);
      res.status(200).json({ success: true, data: files });
    } catch (error) {
      next(error);
    }
  }

  async uploadFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { folderId } = req.params;
      const uploadedById = req.user?.id || 'u-hieutruong';
      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      let filesData: any[] | undefined = undefined;
      if (req.body.filesData) {
        try {
          filesData = typeof req.body.filesData === 'string' ? JSON.parse(req.body.filesData) : req.body.filesData;
        } catch (_) {}
      }
      const result = await documentService.uploadFiles(tenantId, folderId, uploadedById, files, filesData);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const { fileId } = req.params;
      const result = await documentService.deleteFile(tenantId, fileId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async initSampleTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant-phuoc-tan';
      const academicYear = req.body.academicYear || '2026-2027';
      const tree = await documentService.initSampleTree(tenantId, academicYear);
      res.status(200).json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
