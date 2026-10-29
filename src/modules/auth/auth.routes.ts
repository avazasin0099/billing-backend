import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate-request';
import { signupSchema, loginSchema, pinLoginSchema, refreshSchema } from './auth.validation';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/request-logger';

const router = Router();

// Strict limiter on credential endpoints to blunt brute-force (esp. 4-6 digit PINs).
const authLimiter = rateLimiter({ windowMs: 60 * 1000, max: 10 });

router.post('/signup', validateRequest(signupSchema), AuthController.signup);
router.post('/login', authLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/pin-login', authLimiter, validateRequest(pinLoginSchema), AuthController.pinLogin);
router.post('/refresh', validateRequest(refreshSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
