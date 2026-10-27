import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/summary', InventoryController.getSummary);
router.get('/alerts', InventoryController.getAlerts);
router.get('/movements', InventoryController.getMovements);
router.post('/adjustments', authorize([UserRole.OWNER, UserRole.MANAGER]), InventoryController.adjustStock);

export default router;
