import { Request, Response, NextFunction } from 'express';
import { videoService } from '../services/video.service';
import { AuthRequest } from '../middleware/auth';
import { createVideoSchema, updateVideoSchema, updateProgressSchema } from '../validators/video.validator';
import { parseClientInfo } from '../utils/geo';
import { storageService } from '../utils/storage';

export class VideoController {
  async listVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
      const search = req.query.search as string;
      const categoryId = req.query.categoryId as string;
      const sortBy = req.query.sortBy as 'newest' | 'popular' | 'views' | 'duration';

      const result = await videoService.listVideos({ page, limit, search, categoryId, sortBy });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const video = await videoService.getVideoByIdOrSlug(id, userId);

      // Trigger deduplicated view increment (1 view per IP/User per 30 minutes)
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      videoService.incrementViews(video.id, clientIp, userId).catch((e) => console.error('View increment error', e));

      return res.status(200).json({ success: true, video });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await videoService.getCategories();
      return res.status(200).json({ success: true, categories });
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProgressSchema.parse(req.body);
      const progress = await videoService.updateProgress(
        req.user!.userId,
        validated.videoId,
        validated.progressSeconds,
        validated.durationSeconds
      );
      return res.status(200).json({ success: true, progress });
    } catch (error) {
      next(error);
    }
  }

  async getContinueWatching(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const list = await videoService.getContinueWatching(req.user!.userId);
      return res.status(200).json({ success: true, continueWatching: list });
    } catch (error) {
      next(error);
    }
  }

  async authorizeDownload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deviceInfo = parseClientInfo(req);
      const authorization = await videoService.authorizeAndInitiateDownload(
        req.user!.userId,
        id,
        deviceInfo
      );

      return res.status(200).json({
        success: true,
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeDownload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { downloadId } = req.params;
      await videoService.markDownloadComplete(downloadId, req.user!.userId);
      return res.status(200).json({ success: true, message: 'Download marked as completed.' });
    } catch (error) {
      next(error);
    }
  }

  async getDownloadHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const history = await videoService.getUserDownloadHistory(req.user!.userId);
      return res.status(200).json({ success: true, history });
    } catch (error) {
      next(error);
    }
  }

  async uploadVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];
      const thumbFile = files?.thumbnail?.[0];

      if (!videoFile) {
        return res.status(400).json({ success: false, message: 'A video file is required.' });
      }

      const validated = createVideoSchema.parse(req.body);
      const newVideo = await videoService.createVideo(
        req.user!.userId,
        validated,
        videoFile,
        thumbFile
      );

      return res.status(201).json({ success: true, video: newVideo });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Video Streaming endpoint with full Range header support
   */
  async streamVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      const relativePath = `/uploads/videos/${filename}`;
      const stats = await storageService.getFileStats(relativePath);

      if (!stats.exists) {
        return res.status(404).json({ success: false, message: 'Video file not found' });
      }

      const range = req.headers.range;
      const fileSize = stats.size;

      if (range) {
        // Parse Range e.g. "bytes=32324-"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
          return;
        }

        const chunksize = end - start + 1;
        const stream = storageService.getFileStream(relativePath, start, end);

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        stream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        storageService.getFileStream(relativePath).pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }

  async updateVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateVideoSchema.parse(req.body);
      const thumbnailFile = req.file;

      const updated = await videoService.updateVideo(
        id,
        req.user!.userId,
        req.user!.role,
        validated,
        thumbnailFile
      );

      return res.status(200).json({
        success: true,
        message: 'Broadcast updated successfully.',
        video: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await videoService.deleteVideo(id, req.user!.userId, req.user!.role);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const videoController = new VideoController();

