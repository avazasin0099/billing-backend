import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.OWNER, UserRole.MANAGER]));

router.get('/sales', ReportsController.getSales);
router.get('/gst', ReportsController.getGst);
router.get('/profit', authorize([UserRole.OWNER]), ReportsController.getProfitAndLoss);
router.get('/customer-dues', ReportsController.getCustomerDues);

export default router;
