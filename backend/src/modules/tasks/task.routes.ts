import { Router } from 'express';
import { taskController } from './task.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => taskController.getAll(req, res, next));
router.post('/propose', (req, res, next) => taskController.propose(req, res, next));
router.get('/:id/full', (req, res, next) => taskController.getByIdFull(req, res, next));
router.get('/:id/logs', (req, res, next) => taskController.getLogs(req, res, next));
router.post('/', (req, res, next) => taskController.create(req, res, next));
router.put('/:id', (req, res, next) => taskController.update(req, res, next));
router.patch('/:id', (req, res, next) => taskController.update(req, res, next));
router.delete('/:id', (req, res, next) => taskController.delete(req, res, next));

// RACI, Status, Progress
router.post('/:id/assignments', (req, res, next) => taskController.updateAssignments(req, res, next));
router.patch('/:id/status', (req, res, next) => taskController.updateStatus(req, res, next));
router.patch('/:id/progress', (req, res, next) => taskController.updateProgress(req, res, next));

// Đánh giá 4 mức (TT 70, 89)
router.post('/:id/evaluate', (req, res, next) => taskController.evaluate(req, res, next));

// Duyệt / Từ chối đề xuất công việc (TT 77, 113)
router.post('/:id/approve-proposal', (req, res, next) => taskController.approveProposal(req, res, next));
router.post('/:id/reject-proposal', (req, res, next) => taskController.rejectProposal(req, res, next));

// Trao đổi & Mention
router.post('/:id/comments', (req, res, next) => taskController.addComment(req, res, next));

export default router;
