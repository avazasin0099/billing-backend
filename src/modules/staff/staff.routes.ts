import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

// Staff management
router.get('/', authorize([UserRole.OWNER, UserRole.MANAGER]), StaffController.list);
router.post('/', authorize([UserRole.OWNER]), StaffController.create);

// Settings
router.get('/settings', StaffController.getSettings);
router.patch('/settings', authorize([UserRole.OWNER, UserRole.MANAGER]), StaffController.updateSettings);

export default router;
