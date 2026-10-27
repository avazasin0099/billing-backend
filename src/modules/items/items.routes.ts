import { Router } from 'express';
import { ItemsController } from './items.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/meta', ItemsController.getMeta);
router.get('/', ItemsController.list);
router.get('/:id', ItemsController.getById);

// Manager / Owner only modifications
router.post('/', authorize([UserRole.OWNER, UserRole.MANAGER]), ItemsController.create);
router.patch('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), ItemsController.update);
router.post('/import', authorize([UserRole.OWNER, UserRole.MANAGER]), ItemsController.importItems);

export default router;
