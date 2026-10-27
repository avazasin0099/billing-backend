import { Router } from 'express';
import { SyncController } from './sync.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/events', SyncController.pushEvents);
router.get('/conflicts', SyncController.getConflicts);

export default router;
