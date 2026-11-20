import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next));
router.post('/resend-otp', (req, res, next) => authController.resendOtp(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Authenticated session & device security management
router.get('/sessions', authenticateJWT, (req, res, next) => authController.getSessions(req, res, next));
router.delete('/sessions/:sessionId', authenticateJWT, (req, res, next) => authController.revokeSession(req, res, next));
router.get('/trusted-devices', authenticateJWT, (req, res, next) => authController.getTrustedDevices(req, res, next));
router.delete('/trusted-devices/:deviceId', authenticateJWT, (req, res, next) => authController.removeTrustedDevice(req, res, next));
router.get('/login-history', authenticateJWT, (req, res, next) => authController.getLoginHistory(req, res, next));
router.patch('/preferences', authenticateJWT, (req, res, next) => authController.updatePreference(req, res, next));

export default router;
