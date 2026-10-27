import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate-request';
import { signupSchema, loginSchema, pinLoginSchema, refreshSchema } from './auth.validation';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/signup', validateRequest(signupSchema), AuthController.signup);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/pin-login', validateRequest(pinLoginSchema), AuthController.pinLogin);
router.post('/refresh', validateRequest(refreshSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
