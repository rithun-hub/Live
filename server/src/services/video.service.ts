import { prisma } from '../config/prisma';
import { storageService, StorageFile } from '../utils/storage';
import { DeviceInfo } from '../utils/geo';

export class VideoService {
  async listVideos(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    sortBy?: 'newest' | 'popular' | 'views' | 'duration';
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true,
    };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    if (params.categoryId && params.categoryId !== 'all') {
      where.categoryId = params.categoryId;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sortBy === 'popular' || params.sortBy === 'views') {
      orderBy = { viewCount: 'desc' };
    } else if (params.sortBy === 'duration') {
      orderBy = { durationSeconds: 'desc' };
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          uploader: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { displayName: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    return {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVideoByIdOrSlug(identifier: string, userId?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const video = await prisma.video.findFirst({
      where: isUuid ? { id: identifier } : { slug: identifier },
      include: {
        category: true,
        uploader: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true, bio: true },
            },
          },
        },
        _count: {
          select: { comments: true, downloads: true },
        },
      },
    });

    if (!video) {
      throw new Error('Video not found.');
    }

    let userProgress = null;
    if (userId) {
      userProgress = await prisma.videoProgress.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId: video.id,
          },
        },
      });
    }

    return {
      ...video,
      userProgress,
    };
  }

  async incrementViews(videoId: string, ipAddress?: string, userId?: string) {
    if (ipAddress) {
      return this.recordView(videoId, ipAddress, userId);
    }
    return prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
  }

  async recordView(videoId: string, ipAddress: string, userId?: string) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await prisma.videoView.findFirst({
      where: {
        videoId,
        createdAt: { gte: thirtyMinutesAgo },
        OR: [
          { ipAddress },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    if (existing) {
      const v = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, viewCount: true },
      });
      return { incremented: false, viewCount: v?.viewCount || 0 };
    }

    await prisma.videoView.create({
      data: {
        videoId,
        ipAddress: ipAddress || '127.0.0.1',
        userId: userId || null,
      },
    });

    const updated = await prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });

    return { incremented: true, viewCount: updated.viewCount };
  }

  async updateProgress(
    userId: string,
    videoId: string,
    progressSeconds: number,
    durationSeconds: number
  ) {
    const watchedPercent = durationSeconds > 0 ? (progressSeconds / durationSeconds) * 100 : 0;
    const isCompleted = watchedPercent >= 90; // Mark completed at 90% watch

    return prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      create: {
        userId,
        videoId,
        progressSeconds,
        watchedPercent,
        isCompleted,
        lastWatchedAt: new Date(),
      },
      update: {
        progressSeconds,
        watchedPercent,
        isCompleted: isCompleted ? true : undefined,
        lastWatchedAt: new Date(),
      },
    });
  }

  async getContinueWatching(userId: string) {
    return prisma.videoProgress.findMany({
      where: {
        userId,
        isCompleted: false,
        progressSeconds: { gt: 5 },
      },
      orderBy: { lastWatchedAt: 'desc' },
      take: 6,
      include: {
        video: {
          include: {
            category: true,
            uploader: {
              select: {
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
  }

  async getCategories() {
    return prisma.videoCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { videos: true } },
      },
    });
  }

  async authorizeAndInitiateDownload(
    userId: string,
    videoId: string,
    deviceInfo: DeviceInfo
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, dailyDownloadLimit: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new Error('User account is invalid or deactivated.');
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.isPublished) {
      throw new Error('Video is not available for download.');
    }

    // Check downloads completed today by this user
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const downloadsToday = await prisma.videoDownload.count({
      where: {
        userId,
        downloadDate: { gte: startOfDay },
        status: 'COMPLETED',
      },
    });

    if (downloadsToday >= user.dailyDownloadLimit) {
      throw new Error(
        `Daily download limit reached (${downloadsToday}/${user.dailyDownloadLimit} downloads today). Please try again tomorrow.`
      );
    }

    // Create Download Record
    const downloadRecord = await prisma.videoDownload.create({
      data: {
        userId,
        videoId,
        fileSizeBytes: video.fileSizeBytes,
        status: 'PROCESSING',
        ipAddress: deviceInfo.ipAddress,
        browser: deviceInfo.browserName,
        os: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
      },
    });

    return {
      downloadId: downloadRecord.id,
      videoTitle: video.title,
      videoUrl: video.videoUrl,
      fileSizeBytes: video.fileSizeBytes,
      mimeType: video.mimeType,
      remainingToday: user.dailyDownloadLimit - downloadsToday - 1,
    };
  }

  async markDownloadComplete(downloadId: string, userId: string) {
    return prisma.videoDownload.updateMany({
      where: { id: downloadId, userId },
      data: { status: 'COMPLETED' },
    });
  }

  async markDownloadFailed(downloadId: string, userId: string, errorMessage: string) {
    return prisma.videoDownload.updateMany({
      where: { id: downloadId, userId },
      data: { status: 'FAILED', errorMessage },
    });
  }

  async getUserDownloadHistory(userId: string) {
    return prisma.videoDownload.findMany({
      where: { userId },
      orderBy: { downloadDate: 'desc' },
      take: 50,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            durationSeconds: true,
            fileSizeBytes: true,
          },
        },
      },
    });
  }

  async createVideo(
    uploaderId: string,
    data: {
      title: string;
      description?: string;
      categoryId?: string;
      durationSeconds: number;
      resolution?: string;
      isPublished?: boolean;
    },
    videoFile?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File
  ) {
    if (!videoFile) {
      throw new Error('Video media file is required.');
    }

    const savedVideo = await storageService.saveFile(videoFile, 'videos');
    let savedThumbUrl = '/uploads/thumbnails/default-thumb.jpg';

    if (thumbnailFile) {
      const savedThumb = await storageService.saveFile(thumbnailFile, 'thumbnails');
      savedThumbUrl = savedThumb.url;
    }

    // Generate URL-friendly slug
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    return prisma.video.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        videoUrl: savedVideo.url,
        thumbnailUrl: savedThumbUrl,
        durationSeconds: data.durationSeconds || 120,
        fileSizeBytes: savedVideo.sizeBytes,
        mimeType: savedVideo.mimeType,
        resolution: data.resolution || '1080p',
        categoryId: data.categoryId,
        uploaderId,
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
      },
    });
  }

  async updateVideo(
    videoId: string,
    userId: string,
    userRole: string,
    data: {
      title?: string;
      description?: string;
      categoryId?: string | null;
      isPublished?: boolean;
    },
    thumbnailFile?: Express.Multer.File
  ) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error('Video not found.');
    }

    if (video.uploaderId !== userId && userRole !== 'ADMIN') {
      throw new Error('Permission denied: You are not authorized to edit this broadcast.');
    }

    const updatePayload: any = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId || null;
    if (data.isPublished !== undefined) updatePayload.isPublished = data.isPublished;

    if (thumbnailFile) {
      const savedThumb = await storageService.saveFile(thumbnailFile, 'thumbnails');
      updatePayload.thumbnailUrl = savedThumb.url;

      // Clean up old thumbnail if it's local custom upload
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/thumbnails/') && !video.thumbnailUrl.includes('default-thumb')) {
        await storageService.deleteFile(video.thumbnailUrl);
      }
    }

    return prisma.video.update({
      where: { id: videoId },
      data: updatePayload,
      include: {
        category: true,
        uploader: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async deleteVideo(videoId: string, userId: string, userRole: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        uploader: { select: { username: true } },
      },
    });

    if (!video) {
      throw new Error('Video not found.');
    }

    if (video.uploaderId !== userId && userRole !== 'ADMIN') {
      throw new Error('Permission denied: You are not authorized to delete this broadcast.');
    }

    // 1. Delete media files from local storage if applicable
    if (video.videoUrl && video.videoUrl.startsWith('/uploads/videos/')) {
      await storageService.deleteFile(video.videoUrl);
    }

    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/thumbnails/') && !video.thumbnailUrl.includes('default-thumb')) {
      await storageService.deleteFile(video.thumbnailUrl);
    }

    // 2. Cascade delete database record
    await prisma.video.delete({
      where: { id: videoId },
    });

    return {
      success: true,
      deletedVideoId: videoId,
      title: video.title,
      message: `Broadcast "${video.title}" was permanently removed.`,
    };
  }
}

export const videoService = new VideoService();

