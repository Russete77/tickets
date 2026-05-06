/**
 * Backfill — sub-projeto 1 (CRUDs admin do cashless).
 *
 * 1. Pra cada Event que tem POSProducts: cria ProductCategory por enum em uso, popula categoryId.
 * 2. Pra cada POSOperator com `pin` em texto: gera pinHash = bcrypt.hash(pin, 10).
 *
 * Idempotente: rodar quantas vezes quiser.
 *
 * Uso:
 *   npx tsx scripts/backfill-cashless-admin.ts          # dry-run
 *   npx tsx scripts/backfill-cashless-admin.ts --apply  # executa
 */
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';

const APPLY = process.argv.includes('--apply');
const BATCH = 100;

async function backfillCategories() {
  console.log('=== Categorias ===');
  const events = await prisma.event.findMany({
    where: {
      pointsOfSale: { some: { products: { some: {} } } },
    },
    select: { id: true, title: true },
  });

  let created = 0;
  let updated = 0;

  for (const event of events) {
    const productsByEnum = await prisma.pOSProduct.groupBy({
      by: ['category'],
      where: { pos: { eventId: event.id }, categoryId: null },
      _count: true,
    });

    if (productsByEnum.length === 0) continue;

    console.log(
      `Event ${event.title} (${event.id}): ${productsByEnum.length} categorias enum em uso`,
    );

    for (const row of productsByEnum) {
      const name = `Categoria: ${row.category}`;
      let category = await prisma.productCategory.findUnique({
        where: { eventId_name: { eventId: event.id, name } },
      });

      if (!category && APPLY) {
        category = await prisma.productCategory.create({
          data: { eventId: event.id, name, sortOrder: 0 },
        });
        created++;
        console.log(`  + created category "${name}"`);
      } else if (!category) {
        console.log(`  [dry] would create "${name}"`);
        created++;
        continue;
      }

      const update = await prisma.pOSProduct.updateMany({
        where: { pos: { eventId: event.id }, category: row.category, categoryId: null },
        data: { categoryId: category.id },
      });
      if (APPLY) {
        updated += update.count;
        console.log(`  → linked ${update.count} produtos`);
      } else {
        console.log(`  [dry] would link products`);
      }
    }
  }

  console.log(`Categorias: ${created} criadas, ${updated} produtos vinculados.`);
}

async function backfillPinHash() {
  console.log('=== PIN bcrypt ===');
  const total = await prisma.pOSOperator.count({ where: { pinHash: null } });
  console.log(`${total} operadores sem pinHash.`);

  let processed = 0;
  while (processed < total) {
    const ops = await prisma.pOSOperator.findMany({
      where: { pinHash: null },
      take: BATCH,
      select: { id: true, pin: true },
    });
    if (ops.length === 0) break;

    for (const op of ops) {
      const hash = await bcrypt.hash(op.pin, 10);
      if (APPLY) {
        await prisma.pOSOperator.update({
          where: { id: op.id },
          data: { pinHash: hash },
        });
      }
      processed++;
    }
    console.log(`  ${processed}/${total}`);
    if (APPLY) await new Promise((r) => setTimeout(r, 100));
  }
  console.log(APPLY ? `Backfill PIN concluído.` : `[dry] backfill PIN simulado.`);
}

async function main() {
  console.log(APPLY ? '🚀 APPLY mode' : '👀 DRY-RUN mode');
  await backfillCategories();
  await backfillPinHash();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
