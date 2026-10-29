import { Router } from 'express';
import { PurchasesController } from './purchases.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/', PurchasesController.list);
router.get('/:id', PurchasesController.getById);
router.post('/', authorize([UserRole.OWNER, UserRole.MANAGER]), PurchasesController.create);
router.put('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), PurchasesController.update);
router.patch('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), PurchasesController.update);
router.delete('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), PurchasesController.delete);

export default router;
