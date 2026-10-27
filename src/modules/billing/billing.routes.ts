import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/', BillingController.list);
router.post('/', BillingController.create);
router.get('/:id', BillingController.getById);
router.post(
  '/:id/returns',
  authorize([UserRole.OWNER, UserRole.MANAGER]),
  BillingController.createReturn
);

export default router;
