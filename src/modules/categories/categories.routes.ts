import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

// Any authenticated staff can read the category list (needed by the Add Item picker).
router.get('/', CategoriesController.list);

// Manager / Owner only modifications.
router.post('/', authorize([UserRole.OWNER, UserRole.MANAGER]), CategoriesController.create);
router.patch('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), CategoriesController.update);
router.delete('/:id', authorize([UserRole.OWNER, UserRole.MANAGER]), CategoriesController.remove);

export default router;
