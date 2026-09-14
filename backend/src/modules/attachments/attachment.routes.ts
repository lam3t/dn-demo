import { Router } from 'express';
import { attachmentController } from './attachment.controller';
import { requireAuth } from '../auth/auth.middleware';
import { uploadAttachment } from './multer.config';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Cho phép upload đơn hoặc đa file tối đa 10 file/lần
router.post(
  '/',
  uploadAttachment.array('files', 10),
  (req, res, next) => attachmentController.upload(req, res, next)
);

// Lấy danh sách minh chứng kho số hoặc theo công việc
router.get('/repository', (req, res, next) => attachmentController.getRepository(req, res, next));
router.get('/', (req, res, next) => {
  const params = req.params as Record<string, string>;
  if (params.id || params.taskId || req.query.taskId) {
    return attachmentController.getByTaskId(req, res, next);
  }
  return attachmentController.getRepository(req, res, next);
});

router.delete('/:id', (req, res, next) => attachmentController.delete(req, res, next));

export default router;

