import { z } from 'zod';

export const createCommentSchema = z.object({
  videoId: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  parentCommentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const reactCommentSchema = z.object({
  type: z.enum(['LIKE', 'DISLIKE']),
});

export const reportCommentSchema = z.object({
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'MISINFORMATION',
    'INAPPROPRIATE_CONTENT',
    'OTHER',
  ]),
  details: z.string().max(500).optional(),
});

export const translateCommentSchema = z.object({
  targetLanguage: z.string().min(2).max(10),
});

