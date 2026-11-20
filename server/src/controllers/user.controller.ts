import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { updateProfileSchema } from '../validators/auth.validator';
import { storageService } from '../utils/storage';

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          dailyDownloadLimit: true,
          createdAt: true,
          profile: true,
          preference: true,
          _count: {
            select: {
              videos: true,
              downloads: true,
              videoProgresses: true,
            },
          },
        },
      });

      return res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;

      if (files?.avatar?.[0]) {
        const saved = await storageService.saveFile(files.avatar[0], 'avatars');
        avatarUrl = saved.url;
      }
      if (files?.cover?.[0]) {
        const saved = await storageService.saveFile(files.cover[0], 'avatars');
        coverUrl = saved.url;
      }

      const updated = await prisma.userProfile.upsert({
        where: { userId: req.user!.userId },
        create: {
          userId: req.user!.userId,
          displayName: validated.displayName || req.user!.username,
          bio: validated.bio,
          country: validated.country,
          website: validated.website,
          avatarUrl,
          coverUrl,
        },
        update: {
          displayName: validated.displayName,
          bio: validated.bio,
          country: validated.country,
          website: validated.website,
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(coverUrl ? { coverUrl } : {}),
        },
      });

      return res.status(200).json({ success: true, profile: updated });
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return res.status(200).json({ success: true, notifications });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.notification.updateMany({
        where: { id, userId: req.user!.userId },
        data: { isRead: true },
      });

      return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

