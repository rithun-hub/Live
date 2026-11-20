import { Router } from 'express';
import { meetingController } from '../controllers/meeting.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/', authenticateJWT, (req, res, next) => meetingController.createMeeting(req, res, next));
router.get('/my-meetings', authenticateJWT, (req, res, next) => meetingController.listUserMeetings(req, res, next));
router.get('/:roomCode', (req, res, next) => meetingController.getMeeting(req, res, next));
router.post('/:id/end', authenticateJWT, (req, res, next) => meetingController.endMeeting(req, res, next));
router.patch('/:id/permissions', authenticateJWT, (req, res, next) => meetingController.updatePermissions(req, res, next));

export default router;
