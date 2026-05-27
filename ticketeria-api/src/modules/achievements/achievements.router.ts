import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { AchievementsService } from './achievements.service';

const router = Router();

router.get(
  '/achievements/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await AchievementsService.listForUser(req.user!.userId);
      res.json({ success: true, data: list });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/achievements/me/evaluate',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await AchievementsService.evaluateForUser(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },
);

export const achievementsRouter = router;
