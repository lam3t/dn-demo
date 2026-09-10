import { Router } from 'express';
import { taskController } from './task.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => taskController.getAll(req, res, next));
router.get('/:id/full', (req, res, next) => taskController.getByIdFull(req, res, next));
router.post('/', (req, res, next) => taskController.create(req, res, next));
router.put('/:id', (req, res, next) => taskController.update(req, res, next));
router.patch('/:id', (req, res, next) => taskController.update(req, res, next));
router.delete('/:id', (req, res, next) => taskController.delete(req, res, next));

// Quản lý Phân công RACI & Trạng thái & Tiến độ & Trao đổi
router.post('/:id/assignments', (req, res, next) =>
  taskController.updateAssignments(req, res, next)
);
router.patch('/:id/status', (req, res, next) => taskController.updateStatus(req, res, next));
router.patch('/:id/progress', (req, res, next) => taskController.updateProgress(req, res, next));
router.post('/:id/comments', (req, res, next) => taskController.addComment(req, res, next));

export default router;
