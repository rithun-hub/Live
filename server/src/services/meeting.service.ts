import { prisma } from '../config/prisma';
import crypto from 'crypto';

export class MeetingService {
  private generateRoomCode(): string {
    // Generate clean 3-part code e.g. "liv-78a-92k"
    const part1 = crypto.randomBytes(2).toString('hex');
    const part2 = crypto.randomBytes(2).toString('hex');
    return `live-${part1}-${part2}`;
  }

  async createMeeting(
    hostId: string,
    data: {
      title: string;
      description?: string;
      maxParticipants?: number;
      screenShareAllowed?: boolean;
      chatAllowed?: boolean;
    }
  ) {
    const roomCode = this.generateRoomCode();

    const meeting = await prisma.meeting.create({
      data: {
        roomCode,
        title: data.title,
        description: data.description,
        hostId,
        maxParticipants: data.maxParticipants || 50,
        screenShareAllowed: data.screenShareAllowed !== undefined ? data.screenShareAllowed : true,
        chatAllowed: data.chatAllowed !== undefined ? data.chatAllowed : true,
        status: 'ACTIVE',
      },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return meeting;
  }

  async getMeetingByRoomCode(roomCode: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { roomCode },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found or invalid room code.');
    }

    if (meeting.status === 'ENDED') {
      throw new Error('This meeting has ended.');
    }

    return meeting;
  }

  async endMeeting(identifier: string, userId: string, userRole?: string) {
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: identifier },
          { roomCode: identifier },
        ],
      },
    });

    if (!meeting) throw new Error('Meeting not found.');
    if (meeting.hostId !== userId && userRole !== 'ADMIN') {
      throw new Error('Only the meeting host or an administrator can end this session.');
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    await prisma.meetingParticipant.updateMany({
      where: { meetingId: meeting.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    return updated;
  }

  async updateMeetingPermissions(
    meetingId: string,
    hostId: string,
    data: {
      isLocked?: boolean;
      screenShareAllowed?: boolean;
      chatAllowed?: boolean;
    }
  ) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new Error('Meeting not found.');
    if (meeting.hostId !== hostId) throw new Error('Only the host can modify meeting permissions.');

    return prisma.meeting.update({
      where: { id: meetingId },
      data: {
        isLocked: data.isLocked !== undefined ? data.isLocked : undefined,
        screenShareAllowed: data.screenShareAllowed !== undefined ? data.screenShareAllowed : undefined,
        chatAllowed: data.chatAllowed !== undefined ? data.chatAllowed : undefined,
      },
    });
  }

  async listUserMeetings(userId: string) {
    return prisma.meeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        host: {
          select: {
            username: true,
            profile: { select: { displayName: true } },
          },
        },
        _count: {
          select: { participants: true },
        },
      },
    });
  }
}

export const meetingService = new MeetingService();

