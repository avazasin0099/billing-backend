import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/', ExpensesController.list);
router.post('/', authorize([UserRole.OWNER, UserRole.MANAGER]), ExpensesController.create);
router.get('/cash-book', authorize([UserRole.OWNER, UserRole.MANAGER]), ExpensesController.getCashBook);
router.get('/bank-book', authorize([UserRole.OWNER, UserRole.MANAGER]), ExpensesController.getBankBook);

export default router;
