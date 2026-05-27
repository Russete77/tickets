import { Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { prisma } from '../../config/database';
import { AchievementsService } from '../../modules/achievements/achievements.service';

export const achievementEvaluatorWorker = new Worker(
  'achievement-evaluator',
  async (job) => {
    const userIds = (job.data?.userIds as string[] | undefined) ?? null;
    const targets = userIds && userIds.length
      ? userIds
      : (await prisma.user.findMany({ select: { id: true }, take: 10_000 })).map((u) => u.id);
    let totalUnlocked = 0;
    for (const userId of targets) {
      try {
        const r = await AchievementsService.evaluateForUser(userId);
        totalUnlocked += r.unlocked.length;
      } catch (err) {
        logger.warn({ err, userId }, 'achievement evaluation failed for user');
      }
    }
    logger.info(`achievement-evaluator job ${job.id}: ${targets.length} users, ${totalUnlocked} unlocks`);
  },
  { connection: redis, concurrency: 1 },
);

achievementEvaluatorWorker.on('failed', (job, err) => {
  logger.error(`achievement-evaluator ${job?.id} failed: ${err.message}`);
});
