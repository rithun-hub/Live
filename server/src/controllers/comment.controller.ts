import { Request, Response, NextFunction } from 'express';
import { commentService } from '../services/comment.service';
import { AuthRequest } from '../middleware/auth';
import {
  createCommentSchema,
  updateCommentSchema,
  reactCommentSchema,
  reportCommentSchema,
  translateCommentSchema,
} from '../validators/comment.validator';

export class CommentController {
  async listComments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.params;
      const sortBy = (req.query.sortBy as any) || 'newest';
      const userId = req.user?.userId;

      const comments = await commentService.listVideoComments(videoId, { sortBy, userId });
      return res.status(200).json({ success: true, comments });
    } catch (error) {
      next(error);
    }
  }

  async postComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = createCommentSchema.parse(req.body);
      const comment = await commentService.postComment(
        req.user!.userId,
        validated.videoId,
        validated.content,
        validated.parentCommentId
      );

      return res.status(201).json({ success: true, comment });
    } catch (error) {
      next(error);
    }
  }

  async editComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateCommentSchema.parse(req.body);
      const updated = await commentService.editComment(req.user!.userId, id, validated.content);

      return res.status(200).json({ success: true, comment: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await commentService.deleteComment(req.user!.userId, req.user!.role, id);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async reactComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = reactCommentSchema.parse(req.body);
      const result = await commentService.reactToComment(req.user!.userId, id, validated.type);

      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async reportComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = reportCommentSchema.parse(req.body);
      const report = await commentService.reportComment(
        req.user!.userId,
        id,
        validated.reason,
        validated.details
      );

      return res.status(201).json({
        success: true,
        message: 'Report submitted for administrator review.',
        report,
      });
    } catch (error) {
      next(error);
    }
  }

  async translateComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = translateCommentSchema.parse(req.body);
      const result = await commentService.translateComment(id, validated.targetLanguage);

      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();
