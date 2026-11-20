import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(3, 'Meeting title must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  maxParticipants: z.number().int().min(2).max(100).default(50),
  screenShareAllowed: z.boolean().default(true),
  chatAllowed: z.boolean().default(true),
});

export const joinMeetingSchema = z.object({
  roomCode: z.string().min(6).max(20),
  guestName: z.string().min(2).max(50).optional(),
});
