import { prisma } from '../config/prisma';

export class AdminService {
  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      activeSessions30d,
      totalVideos,
      publishedVideos,
      viewsAggregate,
      dedupedViewsRecorded,
      totalDownloads,
      completedDownloads,
      failedDownloads,
      totalMeetings,
      activeMeetings,
      endedMeetings,
      totalMeetingParticipants,
      totalComments,
      watchTimeAggregate,
      storageAggregate,
      categoriesList,
      pendingCommentReports,
      recentLogins,
      recentViews,
      recentCompletedDownloads,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.userSession.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      prisma.video.count(),
      prisma.video.count({ where: { isPublished: true } }),
      prisma.video.aggregate({
        _sum: { viewCount: true },
      }),
      prisma.videoView.count(),
      prisma.videoDownload.count(),
      prisma.videoDownload.count({ where: { status: 'COMPLETED' } }),
      prisma.videoDownload.count({ where: { status: 'FAILED' } }),
      prisma.meeting.count(),
      prisma.meeting.count({ where: { status: 'ACTIVE' } }),
      prisma.meeting.count({ where: { status: 'ENDED' } }),
      prisma.meetingParticipant.count(),
      prisma.comment.count(),
      prisma.videoProgress.aggregate({
        _sum: { progressSeconds: true },
      }),
      prisma.video.aggregate({
        _sum: { fileSizeBytes: true },
      }),
      prisma.videoCategory.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { videos: true },
          },
        },
      }),
      prisma.commentReport.count({ where: { status: 'PENDING' } }),
      prisma.loginHistory.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: {
            select: { username: true, role: true },
          },
        },
      }),
      prisma.videoView.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.videoDownload.findMany({
        where: { downloadDate: { gte: sevenDaysAgo }, status: 'COMPLETED' },
        select: { downloadDate: true },
      }),
    ]);

    const totalWatchTimeSeconds = Math.round(watchTimeAggregate._sum.progressSeconds || 0);
    const totalViews = viewsAggregate._sum.viewCount || 0;
    const totalStorageBytes = storageAggregate._sum.fileSizeBytes || 0;

    // Build real 7-day activity timeline (Strictly 0 if no records exist)
    const last7DaysMap = new Map<string, { date: string; views: number; downloads: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      last7DaysMap.set(key, { date: key, views: 0, downloads: 0 });
    }

    for (const v of recentViews) {
      const key = v.createdAt.toISOString().split('T')[0];
      const entry = last7DaysMap.get(key);
      if (entry) entry.views += 1;
    }

    for (const d of recentCompletedDownloads) {
      const key = d.downloadDate.toISOString().split('T')[0];
      const entry = last7DaysMap.get(key);
      if (entry) entry.downloads += 1;
    }

    const activityTimeline = Array.from(last7DaysMap.values());

    // User engagement: real total interactions
    const userEngagementScore = totalViews + totalComments + completedDownloads + totalMeetingParticipants;

    return {
      // User statistics
      totalUsers,
      activeUsers,
      activeSessions30d,
      // Video broadcast statistics
      totalVideos,
      publishedVideos,
      categoriesBreakdown: categoriesList.map((c) => ({
        name: c.name,
        slug: c.slug,
        count: c._count.videos,
      })),
      // View and playback metrics
      totalViews,
      dedupedViewsRecorded,
      totalWatchTimeSeconds,
      watchTimeHours: Number((totalWatchTimeSeconds / 3600).toFixed(1)),
      watchTimeMinutes: Math.floor(totalWatchTimeSeconds / 60),
      totalStorageBytes,
      totalStorageMB: Number((totalStorageBytes / (1024 * 1024)).toFixed(1)),
      // Downloads
      totalDownloads,
      completedDownloads,
      failedDownloads,
      // Real-time meetings
      totalMeetings,
      activeMeetings,
      endedMeetings,
      totalMeetingParticipants,
      // Community
      totalComments,
      pendingCommentReports,
      userEngagementScore,
      // Real 7-day timeline
      activityTimeline,
      // Recent audit logins
      recentLogins,
    };
  }

  async listUsers(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search } },
        { username: { contains: params.search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          dailyDownloadLimit: true,
          createdAt: true,
          profile: true,
          _count: {
            select: {
              videos: true,
              downloads: true,
              comments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleUserActive(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateUserDownloadLimit(userId: string, dailyDownloadLimit: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { dailyDownloadLimit },
    });
  }

  async listReportedComments() {
    return prisma.commentReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { username: true, email: true },
        },
        comment: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            video: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  async resolveReport(reportId: string, action: 'DISMISS' | 'DELETE_COMMENT') {
    const report = await prisma.commentReport.findUnique({
      where: { id: reportId },
      include: { comment: true },
    });

    if (!report) throw new Error('Report not found.');

    if (action === 'DELETE_COMMENT' && report.commentId) {
      await prisma.comment.delete({ where: { id: report.commentId } });
    }

    return prisma.commentReport.update({
      where: { id: reportId },
      data: {
        status: action === 'DELETE_COMMENT' ? 'RESOLVED' : 'DISMISSED',
        reviewedAt: new Date(),
      },
    });
  }

  async listDownloads(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const [downloads, total] = await Promise.all([
      prisma.videoDownload.findMany({
        skip,
        take: limit,
        orderBy: { downloadDate: 'desc' },
        include: {
          user: { select: { username: true, email: true } },
          video: { select: { title: true } },
        },
      }),
      prisma.videoDownload.count(),
    ]);

    return {
      downloads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listLoginHistory(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const [logins, total] = await Promise.all([
      prisma.loginHistory.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { username: true, role: true } },
        },
      }),
      prisma.loginHistory.count(),
    ]);

    return {
      logins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listActiveMeetings(filterStatus?: string) {
    const where: any = {};
    if (filterStatus && filterStatus !== 'ALL') {
      where.status = filterStatus;
    }
    return prisma.meeting.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        host: { select: { id: true, username: true, email: true } },
        participants: {
          include: {
            user: { select: { username: true } },
          },
        },
      },
    });
  }
}

export const adminService = new AdminService();

