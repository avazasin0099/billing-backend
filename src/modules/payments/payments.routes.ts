import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', PaymentsController.list);
router.post('/', PaymentsController.create);
router.get('/:id', PaymentsController.getById);

export default router;
