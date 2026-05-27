import { z } from 'zod';

export const requestFriendshipSchema = z.object({
  addressee: z.string().min(1).max(255),
});

export const friendshipIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const friendsListQuerySchema = z.object({
  status: z.enum(['accepted', 'pending']).optional(),
});

export const friendsPresentParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
});
