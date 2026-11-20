import { Router } from 'express';
import { videoController } from '../controllers/video.controller';
import { authenticateJWT, optionalAuth } from '../middleware/auth';
import { uploadMedia } from '../middleware/upload';

const router = Router();

router.get('/', (req, res, next) => videoController.listVideos(req, res, next));
router.get('/categories', (req, res, next) => videoController.getCategories(req, res, next));
router.get('/continue-watching', authenticateJWT, (req, res, next) => videoController.getContinueWatching(req, res, next));
router.get('/stream/:filename', (req, res, next) => videoController.streamVideo(req, res, next));

router.get('/downloads/history', authenticateJWT, (req, res, next) => videoController.getDownloadHistory(req, res, next));
router.post('/downloads/:id/authorize', authenticateJWT, (req, res, next) => videoController.authorizeDownload(req, res, next));
router.patch('/downloads/:downloadId/complete', authenticateJWT, (req, res, next) => videoController.completeDownload(req, res, next));

router.get('/:id', optionalAuth, (req, res, next) => videoController.getVideo(req, res, next));
router.post('/progress', authenticateJWT, (req, res, next) => videoController.updateProgress(req, res, next));

router.post(
  '/upload',
  authenticateJWT,
  uploadMedia.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res, next) => videoController.uploadVideo(req, res, next)
);

export default router;

