import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { authenticateJWT, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/video/:videoId', optionalAuth, (req, res, next) => commentController.listComments(req, res, next));
router.post('/', authenticateJWT, (req, res, next) => commentController.postComment(req, res, next));
router.put('/:id', authenticateJWT, (req, res, next) => commentController.editComment(req, res, next));
router.delete('/:id', authenticateJWT, (req, res, next) => commentController.deleteComment(req, res, next));
router.post('/:id/react', authenticateJWT, (req, res, next) => commentController.reactComment(req, res, next));
router.post('/:id/report', authenticateJWT, (req, res, next) => commentController.reportComment(req, res, next));
router.post('/:id/translate', (req, res, next) => commentController.translateComment(req, res, next));

export default router;
