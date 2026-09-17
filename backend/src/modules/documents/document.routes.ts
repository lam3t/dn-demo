import { Router } from 'express';
import multer from 'multer';
import { documentController } from './document.controller';
import { requireAuth } from '../auth/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    fieldSize: 100 * 1024 * 1024, // 100MB
  },
});

const router = Router();

router.use(requireAuth);

// Cây thư mục & tạo thư mục
router.get('/folders', (req, res, next) => documentController.getTree(req, res, next));
router.post('/folders', (req, res, next) => documentController.createFolder(req, res, next));
router.patch('/folders/:id', (req, res, next) => documentController.updateFolder(req, res, next));
router.delete('/folders/:id', (req, res, next) => documentController.deleteFolder(req, res, next));

// Khởi tạo cây mẫu
router.post('/sample-tree', (req, res, next) => documentController.initSampleTree(req, res, next));

// Tệp tin trong thư mục
router.get('/folders/:folderId/files', (req, res, next) => documentController.getFilesByFolder(req, res, next));
router.post('/folders/:folderId/files', upload.array('files', 10), (req, res, next) =>
  documentController.uploadFiles(req, res, next)
);

// Xóa tệp
router.delete('/files/:fileId', (req, res, next) => documentController.deleteFile(req, res, next));

export default router;
