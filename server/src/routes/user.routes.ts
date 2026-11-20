import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateJWT } from '../middleware/auth';
import { uploadMedia } from '../middleware/upload';

const router = Router();

router.use(authenticateJWT);

router.get('/profile', (req, res, next) => userController.getProfile(req, res, next));
router.put(
  '/profile',
  uploadMedia.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  (req, res, next) => userController.updateProfile(req, res, next)
);

router.get('/notifications', (req, res, next) => userController.getNotifications(req, res, next));
router.patch('/notifications/:id/read', (req, res, next) => userController.markNotificationRead(req, res, next));

export default router;
