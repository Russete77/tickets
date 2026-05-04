/**
 * Backfill: cria Organization para cada Producer existente.
 * Idempotente — pode rodar várias vezes.
 *
 * Uso:
 *   npx tsx scripts/backfill-organizations.ts          # dry-run
 *   npx tsx scripts/backfill-organizations.ts --apply  # executa
 *
 * Auditoria CTO 2026-05 — gap 4.1 (multi-tenancy)
 */
import { prisma } from '../src/config/database';
import { logger } from '../src/shared/logger';

interface BackfillStats {
  producersFound: number;
  organizationsCreated: number;
  organizationsExisted: number;
  membersCreated: number;
  errors: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

async function backfill(apply: boolean): Promise<BackfillStats> {
  const stats: BackfillStats = {
    producersFound: 0,
    organizationsCreated: 0,
    organizationsExisted: 0,
    membersCreated: 0,
    errors: 0,
  };

  const producers = await prisma.producer.findMany({
    include: { user: true },
  });

  stats.producersFound = producers.length;
  logger.info({ count: producers.length }, 'Backfill: producers encontrados');

  for (const producer of producers) {
    try {
      // 1. Verificar se já existe Organization vinculada
      const existing = await prisma.organization.findFirst({
        where: { legacyProducerId: producer.id },
      });

      if (existing) {
        stats.organizationsExisted += 1;
        // Garantir que owner exista
        const member = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: existing.id,
              userId: producer.userId,
            },
          },
        });
        if (!member && apply) {
          await prisma.organizationMember.create({
            data: {
              organizationId: existing.id,
              userId: producer.userId,
              role: 'owner',
              acceptedAt: new Date(),
            },
          });
          stats.membersCreated += 1;
        }
        continue;
      }

      // 2. Gerar slug único
      let baseSlug = slugify(producer.companyName);
      let slug = baseSlug;
      let attempt = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
      }

      if (!apply) {
        logger.info(
          {
            producerId: producer.id,
            companyName: producer.companyName,
            slug,
            owner: producer.user.email,
          },
          'Backfill DRY-RUN: criaria Organization',
        );
        stats.organizationsCreated += 1;
        stats.membersCreated += 1;
        continue;
      }

      // 3. Criar Organization + member em transação
      await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: producer.companyName,
            slug,
            type: 'producer',
            cnpj: producer.cnpj,
            asaasAccountId: producer.asaasAccountId,
            platformFeePercent: producer.platformFeePercent,
            legacyProducerId: producer.id,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: producer.userId,
            role: 'owner',
            acceptedAt: producer.approvedAt ?? new Date(),
          },
        });
      });

      stats.organizationsCreated += 1;
      stats.membersCreated += 1;
    } catch (err) {
      stats.errors += 1;
      logger.error({ err, producerId: producer.id }, 'Backfill: erro ao processar producer');
    }
  }

  return stats;
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (!apply) {
    logger.warn('=== DRY-RUN — nada será gravado. Use --apply para executar. ===');
  }

  const stats = await backfill(apply);
  logger.info(stats, 'Backfill concluído');
  // eslint-disable-next-line no-console
  console.table(stats);

  await prisma.$disconnect();
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  logger.error({ err }, 'Backfill falhou');
  process.exit(1);
});
