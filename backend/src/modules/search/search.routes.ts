import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { SearchController } from './search.controller';

const router = Router();

router.use(requireAuth);

router.get('/global', SearchController.search);

export default router;
