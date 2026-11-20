import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { meetingController } from '../controllers/meeting.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Strictly guard all admin endpoints with authentication and ADMIN role
router.use(authenticateJWT);
router.use(requireRole('ADMIN'));

router.get('/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.patch('/users/:id/active', (req, res, next) => adminController.toggleUserActive(req, res, next));
router.patch('/users/:id/role', (req, res, next) => adminController.updateUserRole(req, res, next));
router.patch('/users/:id/download-limit', (req, res, next) => adminController.updateDownloadLimit(req, res, next));

router.get('/reports', (req, res, next) => adminController.listReports(req, res, next));
router.post('/reports/:id/resolve', (req, res, next) => adminController.resolveReport(req, res, next));

router.get('/downloads', (req, res, next) => adminController.listDownloads(req, res, next));
router.get('/logins', (req, res, next) => adminController.listLogins(req, res, next));
router.get('/meetings', (req, res, next) => adminController.listMeetings(req, res, next));
router.post('/meetings/:id/end', (req, res, next) => meetingController.endMeeting(req, res, next));

export default router;

