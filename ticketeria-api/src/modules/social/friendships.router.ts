import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { FriendshipsService } from './friendships.service';
import {
  requestFriendshipSchema,
  friendshipIdParamsSchema,
  friendsListQuerySchema,
  friendsPresentParamsSchema,
  blockUserSchema,
} from './friendships.validators';

const router = Router();

router.post(
  '/friendships/request',
  authenticate,
  validate({ body: requestFriendshipSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const f = await FriendshipsService.request(req.user!.userId, req.body.addressee as string);
      res.status(201).json({ success: true, data: f });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/friendships/:id/accept',
  authenticate,
  validate({ params: friendshipIdParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const f = await FriendshipsService.accept(req.user!.userId, req.params.id as string);
      res.json({ success: true, data: f });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/friendships/:id/reject',
  authenticate,
  validate({ params: friendshipIdParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const f = await FriendshipsService.reject(req.user!.userId, req.params.id as string);
      res.json({ success: true, data: f });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/friendships/block',
  authenticate,
  validate({ body: blockUserSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const f = await FriendshipsService.block(req.user!.userId, req.body.userId as string);
      res.json({ success: true, data: f });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/friendships/me',
  authenticate,
  validate({ query: friendsListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = ((req.query.status as 'accepted' | 'pending') ?? 'accepted');
      const list = await FriendshipsService.listMine(req.user!.userId, status);
      res.json({ success: true, data: list });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/events/:eventId/friends-present',
  authenticate,
  validate({ params: friendsPresentParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await FriendshipsService.friendsPresentAtEvent(req.user!.userId, req.params.eventId as string);
      res.json({ success: true, data: list });
    } catch (e) {
      next(e);
    }
  },
);

export const friendshipsRouter = router;
