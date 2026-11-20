import { Router } from 'express';
import authRoutes from './auth.routes';
import videoRoutes from './video.routes';
import commentRoutes from './comment.routes';
import meetingRoutes from './meeting.routes';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/meetings', meetingRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);

export default router;
