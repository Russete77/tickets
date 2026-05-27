import { prisma } from '../../config/database';

interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  tier: number;
}

const CATALOG: AchievementSeed[] = [
  { key: 'first_event', name: 'Estreante', description: 'Foi a 1 evento', tier: 1 },
  { key: 'five_events', name: 'Frequentador', description: 'Foi a 5 eventos', tier: 2 },
  { key: 'ten_events', name: 'Insider', description: 'Foi a 10 eventos', tier: 3 },
  { key: 'first_purchase', name: 'Primeira compra', description: 'Comprou seu 1º ingresso', tier: 1 },
  { key: 'big_spender', name: 'Mão Aberta', description: 'Recarregou R$ 500+ no cashless', tier: 2 },
  { key: 'social_butterfly', name: 'Sociável', description: 'Tem 10+ amigos no app', tier: 2 },
];

export class AchievementsService {
  static async seedCatalog(): Promise<void> {
    for (const a of CATALOG) {
      await prisma.achievement.upsert({
        where: { key: a.key },
        create: a,
        update: { name: a.name, description: a.description, tier: a.tier },
      });
    }
  }

  static async evaluateForUser(userId: string): Promise<{ unlocked: string[]; progress: Record<string, number> }> {
    await this.seedCatalog();

    const [usedTicketCount, orderCount, totalRecharge, friendsCount] = await Promise.all([
      prisma.ticket.count({ where: { holderId: userId, status: 'used' } }),
      prisma.order.count({ where: { userId, status: 'paid' } }),
      prisma.cashlessTransaction
        .aggregate({
          where: { wallet: { userId }, type: 'topup' },
          _sum: { amountCents: true },
        })
        .then((r) => r._sum?.amountCents ?? 0),
      prisma.friendship.count({
        where: {
          status: 'accepted',
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
    ]);

    const progress: Record<string, number> = {
      first_event: usedTicketCount,
      five_events: usedTicketCount,
      ten_events: usedTicketCount,
      first_purchase: orderCount,
      big_spender: totalRecharge,
      social_butterfly: friendsCount,
    };

    const thresholds: Record<string, number> = {
      first_event: 1,
      five_events: 5,
      ten_events: 10,
      first_purchase: 1,
      big_spender: 50_000,
      social_butterfly: 10,
    };

    const unlocked: string[] = [];
    const achs = await prisma.achievement.findMany({ where: { key: { in: Object.keys(thresholds) } } });
    for (const a of achs) {
      const cur = progress[a.key] ?? 0;
      const need = thresholds[a.key]!;
      const ua = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: a.id } },
      });
      const justUnlocked = cur >= need && !ua?.unlockedAt;
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: a.id } },
        create: {
          userId,
          achievementId: a.id,
          progress: cur,
          unlockedAt: cur >= need ? new Date() : null,
        },
        update: {
          progress: cur,
          unlockedAt: ua?.unlockedAt ?? (cur >= need ? new Date() : null),
        },
      });
      if (justUnlocked) unlocked.push(a.key);
    }

    return { unlocked, progress };
  }

  static async listForUser(userId: string) {
    await this.seedCatalog();
    const rows = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: [{ unlockedAt: { sort: 'desc', nulls: 'last' } }, { achievement: { tier: 'asc' } }],
    });
    if (rows.length === 0) {
      const catalog = await prisma.achievement.findMany({ orderBy: { tier: 'asc' } });
      return catalog.map((a) => ({
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        tier: a.tier,
        iconUrl: a.iconUrl,
        progress: 0,
        unlockedAt: null,
      }));
    }
    return rows.map((r) => ({
      id: r.achievement.id,
      key: r.achievement.key,
      name: r.achievement.name,
      description: r.achievement.description,
      tier: r.achievement.tier,
      iconUrl: r.achievement.iconUrl,
      progress: r.progress,
      unlockedAt: r.unlockedAt,
    }));
  }
}
