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
  'image/heic',
  'image/heif',
  'image/svg+xml',
];

// Sử dụng memoryStorage để tương thích hoàn toàn với Serverless (Vercel / Lambda)
const storage = multer.memoryStorage();

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB tối đa mỗi tệp
    fieldSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isImage = mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);

    if (ALLOWED_MIME_TYPES.includes(mime) || isImage) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp PDF, Word (doc/docx), Excel (xls/xlsx) hoặc Hình ảnh (jpg/png/webp/heic).',
          400
        )
      );
    }
  },
});
