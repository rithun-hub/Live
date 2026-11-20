import { z } from 'zod';

export const createVideoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().max(3000).optional(),
  categoryId: z.string().optional(),
  durationSeconds: z.coerce.number().min(0).default(0),
  resolution: z.string().optional().default('1080p'),
  isPublished: z.coerce.boolean().default(true),
});

export const updateVideoSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(3000).optional(),
  categoryId: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export const updateProgressSchema = z.object({
  videoId: z.string().uuid(),
  progressSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
});
