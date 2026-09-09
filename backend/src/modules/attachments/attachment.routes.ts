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

router.get('/', (req, res, next) => attachmentController.getByTaskId(req, res, next));
router.delete('/:id', (req, res, next) => attachmentController.delete(req, res, next));

export default router;
