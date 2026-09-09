import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../../middlewares/error.middleware';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const taskId = req.params.id || req.params.taskId || 'general';
    const uploadDir = path.join(__dirname, '../../../uploads/tasks', taskId);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Giữ tên file sạch và thêm timestamp chống trùng
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Giới hạn 20MB
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp PDF, Word (doc/docx), Excel (xls/xlsx) hoặc Hình ảnh (jpg/png/webp).',
          400
        )
      );
    }
  },
});
