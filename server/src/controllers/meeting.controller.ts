import { Request, Response, NextFunction } from 'express';
import { meetingService } from '../services/meeting.service';
import { AuthRequest } from '../middleware/auth';
import { createMeetingSchema } from '../validators/meeting.validator';
import { ENV } from '../config/env';
import { notifyAndCloseMeetingRoom } from '../sockets/signaling';

export class MeetingController {
  async createMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = createMeetingSchema.parse(req.body);
      const meeting = await meetingService.createMeeting(req.user!.userId, validated);

      return res.status(201).json({
        success: true,
        meeting,
        webrtcConfig: {
          iceServers: [
            { urls: ENV.STUN_SERVER },
            ...(ENV.TURN_SERVER
              ? [
                  {
                    urls: ENV.TURN_SERVER,
                    username: ENV.TURN_USERNAME,
                    credential: ENV.TURN_CREDENTIAL,
                  },
                ]
              : []),
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomCode } = req.params;
      const meeting = await meetingService.getMeetingByRoomCode(roomCode);

      return res.status(200).json({
        success: true,
        meeting,
        webrtcConfig: {
          iceServers: [
            { urls: ENV.STUN_SERVER },
            ...(ENV.TURN_SERVER
              ? [
                  {
                    urls: ENV.TURN_SERVER,
                    username: ENV.TURN_USERNAME,
                    credential: ENV.TURN_CREDENTIAL,
                  },
                ]
              : []),
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async endMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await meetingService.endMeeting(id, req.user!.userId, req.user!.role);
      notifyAndCloseMeetingRoom(updated.roomCode, req.user!.role === 'ADMIN' ? 'the Administrator' : 'the Host');

      return res.status(200).json({
        success: true,
        message: 'Meeting has been ended successfully.',
        meeting: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await meetingService.updateMeetingPermissions(id, req.user!.userId, req.body);

      return res.status(200).json({ success: true, meeting: updated });
    } catch (error) {
      next(error);
    }
  }

  async listUserMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meetings = await meetingService.listUserMeetings(req.user!.userId);
      return res.status(200).json({ success: true, meetings });
    } catch (error) {
      next(error);
    }
  }
}

export const meetingController = new MeetingController();

