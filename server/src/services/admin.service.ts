import { prisma } from '../config/prisma';

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalVideos,
      viewsAggregate,
      totalDownloads,
      activeMeetings,
      pendingCommentReports,
      recentLogins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.video.count(),
      prisma.video.aggregate({
        _sum: { viewCount: true },
      }),
      prisma.videoDownload.count(),
      prisma.meeting.count({ where: { status: 'ACTIVE' } }),
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
    ]);

    // Download statistics summary
    const completedDownloads = await prisma.videoDownload.count({ where: { status: 'COMPLETED' } });
    const failedDownloads = await prisma.videoDownload.count({ where: { status: 'FAILED' } });

    return {
      totalUsers,
      activeUsers,
      totalVideos,
      totalViews: viewsAggregate._sum.viewCount || 0,
      totalDownloads,
      completedDownloads,
      failedDownloads,
      activeMeetings,
      pendingCommentReports,
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

  async listActiveMeetings() {
    return prisma.meeting.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      include: {
        host: { select: { username: true, email: true } },
        participants: {
          where: { leftAt: null },
          include: {
            user: { select: { username: true } },
          },
        },
      },
    });
  }
}

export const adminService = new AdminService();

