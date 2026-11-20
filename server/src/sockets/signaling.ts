import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma';

interface ParticipantState {
  socketId: string;
  userId?: string;
  name: string;
  role: 'HOST' | 'CO_HOST' | 'PARTICIPANT';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  avatarUrl?: string;
}

interface RoomState {
  roomCode: string;
  meetingId: string;
  hostId: string;
  isLocked: boolean;
  screenShareAllowed: boolean;
  chatAllowed: boolean;
  maxParticipants: number;
  participants: Map<string, ParticipantState>; // socketId -> ParticipantState
}

const activeRooms = new Map<string, RoomState>();
let signalingIO: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return signalingIO;
}

export function notifyAndCloseMeetingRoom(roomCode: string, endedBy: string = 'Host') {
  if (signalingIO) {
    signalingIO.to(roomCode).emit('meeting-ended-by-host', {
      roomCode,
      message: `This meeting was ended by ${endedBy}. All participants have been disconnected.`,
      endedAt: new Date().toISOString(),
    });
  }
  activeRooms.delete(roomCode);
}

export function setupSignaling(io: SocketIOServer) {
  signalingIO = io;
  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;

    // 1. Join Room
    socket.on('join-room', async (data: {
      roomCode: string;
      userId?: string;
      name: string;
      avatarUrl?: string;
    }) => {
      try {
        const { roomCode, userId, name, avatarUrl } = data;
        const meeting = await prisma.meeting.findUnique({
          where: { roomCode },
          include: { host: true },
        });

        if (!meeting || meeting.status === 'ENDED') {
          socket.emit('meeting-error', { message: 'Meeting does not exist or has already ended.' });
          return;
        }

        let room = activeRooms.get(roomCode);
        if (!room) {
          room = {
            roomCode,
            meetingId: meeting.id,
            hostId: meeting.hostId,
            isLocked: meeting.isLocked,
            screenShareAllowed: meeting.screenShareAllowed,
            chatAllowed: meeting.chatAllowed,
            maxParticipants: meeting.maxParticipants,
            participants: new Map(),
          };
          activeRooms.set(roomCode, room);
        }

        if (room.isLocked && userId !== room.hostId) {
          socket.emit('meeting-error', { message: 'This meeting is locked by the host.' });
          return;
        }

        if (room.participants.size >= room.maxParticipants) {
          socket.emit('meeting-error', { message: 'This meeting is full. Maximum participants reached.' });
          return;
        }

        const isHost = userId === room.hostId;
        const role = isHost ? 'HOST' : 'PARTICIPANT';

        const participant: ParticipantState = {
          socketId: socket.id,
          userId,
          name: name || 'Guest Participant',
          role,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isHandRaised: false,
          isSpeaking: false,
          avatarUrl,
        };

        room.participants.set(socket.id, participant);
        currentRoomCode = roomCode;
        socket.join(roomCode);

        // Record participant entry in database
        await prisma.meetingParticipant.create({
          data: {
            meetingId: room.meetingId,
            userId: userId || null,
            guestName: !userId ? participant.name : null,
            socketId: socket.id,
            role,
          },
        }).catch((e) => console.error('Error logging participant DB', e));

        // Existing participants list to send to the newly joined peer
        const otherParticipants = Array.from(room.participants.values()).filter(
          (p) => p.socketId !== socket.id
        );

        // Send room state and other participants to new peer
        socket.emit('room-joined', {
          roomCode,
          meetingId: room.meetingId,
          isHost,
          role,
          permissions: {
            isLocked: room.isLocked,
            screenShareAllowed: room.screenShareAllowed,
            chatAllowed: room.chatAllowed,
          },
          self: participant,
          participants: otherParticipants,
        });

        // Notify other participants that a new peer has joined
        socket.to(roomCode).emit('participant-joined', {
          participant,
        });

        console.log(`[Socket] ${participant.name} (${socket.id}) joined meeting ${roomCode}`);
      } catch (err) {
        console.error('Error in join-room', err);
        socket.emit('meeting-error', { message: 'Could not connect to meeting room.' });
      }
    });

    // 2. WebRTC Signaling: Offer
    socket.on('webrtc-offer', (data: { targetSocketId: string; offer: any }) => {
      io.to(data.targetSocketId).emit('webrtc-offer', {
        callerSocketId: socket.id,
        offer: data.offer,
      });
    });

    // 3. WebRTC Signaling: Answer
    socket.on('webrtc-answer', (data: { targetSocketId: string; answer: any }) => {
      io.to(data.targetSocketId).emit('webrtc-answer', {
        responderSocketId: socket.id,
        answer: data.answer,
      });
    });

    // 4. WebRTC Signaling: ICE Candidate
    socket.on('webrtc-ice-candidate', (data: { targetSocketId: string; candidate: any }) => {
      io.to(data.targetSocketId).emit('webrtc-ice-candidate', {
        senderSocketId: socket.id,
        candidate: data.candidate,
      });
    });

    // 5. Media State Updates (mute, camera, screen-share, hand raise, speaking)
    socket.on('update-media-state', (updates: Partial<ParticipantState>) => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        Object.assign(participant, updates);
        io.to(currentRoomCode).emit('participant-media-changed', {
          socketId: socket.id,
          updates,
        });
      }
    });

    // 6. In-Call Chat & Reactions
    socket.on('send-meeting-message', async (data: { content: string; fileUrl?: string; fileName?: string }) => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      if (!room || (!room.chatAllowed && room.participants.get(socket.id)?.role !== 'HOST')) {
        socket.emit('meeting-error', { message: 'Chat is disabled in this meeting.' });
        return;
      }

      const participant = room.participants.get(socket.id);
      if (!participant) return;

      const messagePayload = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        senderSocketId: socket.id,
        senderName: participant.name,
        senderRole: participant.role,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        timestamp: new Date().toISOString(),
      };

      io.to(currentRoomCode).emit('new-meeting-message', messagePayload);

      // Save to DB
      await prisma.meetingMessage.create({
        data: {
          meetingId: room.meetingId,
          senderId: participant.userId || null,
          senderName: participant.name,
          content: data.content,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
        },
      }).catch((e) => console.error('Error saving meeting message', e));
    });

    // 7. Live Emoji Reactions
    socket.on('send-reaction', (data: { emoji: string }) => {
      if (!currentRoomCode) return;
      io.to(currentRoomCode).emit('meeting-reaction', {
        socketId: socket.id,
        emoji: data.emoji,
      });
    });

    // 8. Host Controls: Mute Participant
    socket.on('host-mute-participant', (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      const requester = room?.participants.get(socket.id);
      if (requester?.role !== 'HOST') return;

      io.to(data.targetSocketId).emit('host-action-mute');
    });

    // 9. Host Controls: Remove Participant
    socket.on('host-kick-participant', (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      const requester = room?.participants.get(socket.id);
      if (requester?.role !== 'HOST') return;

      io.to(data.targetSocketId).emit('host-action-kick');
    });

    // 10. Host Controls: Lock / Screen Share / Chat Settings
    socket.on('host-update-permissions', async (data: {
      isLocked?: boolean;
      screenShareAllowed?: boolean;
      chatAllowed?: boolean;
    }) => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (requester?.role !== 'HOST') return;

      if (data.isLocked !== undefined) room.isLocked = data.isLocked;
      if (data.screenShareAllowed !== undefined) room.screenShareAllowed = data.screenShareAllowed;
      if (data.chatAllowed !== undefined) room.chatAllowed = data.chatAllowed;

      io.to(currentRoomCode).emit('permissions-updated', {
        isLocked: room.isLocked,
        screenShareAllowed: room.screenShareAllowed,
        chatAllowed: room.chatAllowed,
      });

      await prisma.meeting.update({
        where: { id: room.meetingId },
        data: {
          isLocked: room.isLocked,
          screenShareAllowed: room.screenShareAllowed,
          chatAllowed: room.chatAllowed,
        },
      }).catch((e) => console.error('Error updating meeting permissions DB', e));
    });

    // 10b. Host Controls: End Meeting for All Participants
    socket.on('host-end-meeting-all', async (data?: { roomCode?: string }) => {
      try {
        const code = data?.roomCode || currentRoomCode;
        if (!code) return;

        const room = activeRooms.get(code);
        const participant = room?.participants.get(socket.id);

        const meeting = await prisma.meeting.findFirst({
          where: { OR: [{ id: code }, { roomCode: code }] },
          include: { host: true },
        });

        if (!meeting) {
          socket.emit('meeting-error', { message: 'Meeting room could not be found.' });
          return;
        }

        const isHost = participant?.role === 'HOST' || (participant?.userId && participant.userId === meeting.hostId);
        let isAdmin = false;

        if (participant?.userId) {
          const userRecord = await prisma.user.findUnique({
            where: { id: participant.userId },
            select: { role: true },
          });
          isAdmin = userRecord?.role === 'ADMIN';
        }

        if (!isHost && !isAdmin) {
          socket.emit('meeting-error', { message: 'Permission denied: Only the meeting creator or administrator can end the session.' });
          return;
        }

        // 1. Update meeting status in DB to ENDED and record endedAt
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
          },
        });

        // 2. Mark all participant sessions as left
        await prisma.meetingParticipant.updateMany({
          where: { meetingId: meeting.id, leftAt: null },
          data: { leftAt: new Date() },
        });

        // 3. Notify all connected participants and close room memory state
        notifyAndCloseMeetingRoom(meeting.roomCode, isAdmin ? 'the Administrator' : 'the Host');
        console.log(`[Socket] Meeting ${meeting.roomCode} was officially ended by ${isAdmin ? 'admin' : 'host'}`);
      } catch (err) {
        console.error('Error handling host-end-meeting-all', err);
        socket.emit('meeting-error', { message: 'Failed to end meeting session.' });
      }
    });

    // 11. Disconnect / Leave
    const handleLeave = async () => {
      if (!currentRoomCode) return;
      const room = activeRooms.get(currentRoomCode);
      if (room) {
        const leaving = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        socket.to(currentRoomCode).emit('participant-left', {
          socketId: socket.id,
          name: leaving?.name,
        });

        // Update DB
        await prisma.meetingParticipant.updateMany({
          where: { socketId: socket.id, leftAt: null },
          data: { leftAt: new Date() },
        }).catch(() => {});

        // If no one is left in the room, clean up memory
        if (room.participants.size === 0) {
          activeRooms.delete(currentRoomCode);
        }
      }
      currentRoomCode = null;
    };

    socket.on('leave-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
