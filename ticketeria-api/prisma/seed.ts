/**
 * Seed PulsePass — cenário completo de teste local.
 * Cria toda a cadeia de dados necessária pra testar fluxo end-to-end:
 * - 3 users (admin/produtor/consumidor)
 * - 1 organization + member
 * - 1 evento publicado vinculado à org
 * - 4 lotes (1º promo / 2º / VIP / camarote)
 * - 1 category cashless + 1 POS bar + 1 produto + 1 operator (PIN 1234)
 * - 1 CashlessWallet pro consumidor com saldo R$ 200
 * - 1 VenueMap com 4 zonas (palco, bar, vip, banheiro)
 * - 6 achievements catalog seeded
 */
import {
  PrismaClient, UserRole, EventCategory, EventStatus, BatchType,
  OrgType, OrgMemberRole, POSType, WalletType, ProductCategoryEnum,
} from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ticketeria?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding PulsePass — cenário completo de teste...\n');

  // ============================================================
  // 1. Users
  // ============================================================
  const [admin, producer, consumer] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@pulsepass.com.br' },
      update: {},
      create: {
        email: 'admin@pulsepass.com.br',
        cpf: '000.000.000-00',
        name: 'Admin PulsePass',
        passwordHash: await bcrypt.hash('Admin@123456', 12),
        role: UserRole.admin,
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'produtor@example.com' },
      update: {},
      create: {
        email: 'produtor@example.com',
        cpf: '111.111.111-11',
        name: 'João Produtor',
        phone: '11999999999',
        passwordHash: await bcrypt.hash('Producer@123456', 12),
        role: UserRole.producer,
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'usuario@example.com' },
      update: {},
      create: {
        email: 'usuario@example.com',
        cpf: '222.222.222-22',
        name: 'Maria Consumidora',
        phone: '11888888888',
        passwordHash: await bcrypt.hash('Consumer@123456', 12),
        role: UserRole.consumer,
        emailVerified: true,
      },
    }),
  ]);
  console.log(`✅ Users: admin / produtor / consumidor`);

  // ============================================================
  // 2. Organization + Member
  // ============================================================
  const org = await prisma.organization.upsert({
    where: { slug: 'smu-producoes' },
    update: {},
    create: {
      name: 'SMU Produções',
      slug: 'smu-producoes',
      type: OrgType.producer,
      cnpj: '12.345.678/0001-90',
    },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: producer.id } },
    update: {},
    create: {
      organizationId: org.id,
      userId: producer.id,
      role: OrgMemberRole.owner,
      acceptedAt: new Date(),
    },
  });
  console.log(`✅ Organization: ${org.name} (producer = owner)`);

  // ============================================================
  // 3. Event
  // ============================================================
  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(22, 0, 0, 0);
  const eventEnd = new Date(nextSaturday);
  eventEnd.setDate(eventEnd.getDate() + 1);
  eventEnd.setHours(4, 0, 0, 0);

  const event = await prisma.event.upsert({
    where: { slug: 'festival-eletronica-sp-2026' },
    update: {},
    create: {
      producerId: producer.id,
      organizationId: org.id,
      title: 'Festival Eletrônica SP 2026',
      slug: 'festival-eletronica-sp-2026',
      description:
        '<p>O maior festival de música eletrônica de São Paulo. 12 horas de música, 4 palcos, mais de 30 DJs nacionais e internacionais.</p>',
      shortDescription: 'O maior festival de música eletrônica de SP. 12h, 4 palcos, 30+ DJs.',
      category: EventCategory.festival,
      status: EventStatus.published,
      venueName: 'Espaço das Américas',
      venueAddress: 'R. Tagipuru, 795 - Barra Funda, São Paulo - SP',
      venueLat: -23.5245,
      venueLng: -46.6653,
      venueCapacity: 5000,
      startsAt: nextSaturday,
      endsAt: eventEnd,
      doorsOpenAt: new Date(nextSaturday.getTime() - 60 * 60 * 1000),
      coverImageUrl: 'https://placehold.co/1200x600/6C5CE7/white?text=Festival+SP+2026',
      tags: ['eletronica', 'festival', 'dj', 'sao-paulo', 'open-bar'],
      ageRating: '18+',
      isOpenBar: true,
      lineup: JSON.parse('["DJ Alpha", "DJ Beta", "DJ Gamma", "MC Delta", "DJ Epsilon"]'),
      rules: 'Proibida a entrada de menores de 18 anos. Documento com foto obrigatório.',
      maxTicketsPerCpf: 4,
    },
  });
  console.log(`✅ Event: ${event.title}  (em ${nextSaturday.toLocaleDateString('pt-BR')})`);

  // ============================================================
  // 4. Ticket batches
  // ============================================================
  const existingBatches = await prisma.ticketBatch.count({ where: { eventId: event.id } });
  if (existingBatches === 0) {
    await prisma.ticketBatch.createMany({
      data: [
        { eventId: event.id, name: '1º Lote', description: 'Lote promocional', priceCents: 8000, quantity: 1000, sortOrder: 1, type: BatchType.regular, isVisible: true },
        { eventId: event.id, name: '2º Lote', description: 'Lote regular', priceCents: 12000, quantity: 2000, sortOrder: 2, type: BatchType.regular, isVisible: false },
        { eventId: event.id, name: 'VIP', description: 'Open bar premium + área VIP', priceCents: 25000, quantity: 500, sortOrder: 3, type: BatchType.vip, isVisible: true },
        { eventId: event.id, name: 'Camarote', description: 'Camarote privativo até 10 pessoas', priceCents: 50000, quantity: 50, sortOrder: 4, type: BatchType.camarote, isVisible: true },
      ],
    });
    console.log(`✅ 4 lotes criados`);
  }

  // ============================================================
  // 5. Cashless — POS Bar + categoria + produtos + operator
  // ============================================================
  const pos = await prisma.pointOfSale.findFirst({ where: { eventId: event.id, name: 'Bar Principal' } })
    ?? await prisma.pointOfSale.create({
      data: {
        eventId: event.id,
        name: 'Bar Principal',
        type: POSType.bar,
        location: 'Pista — centro',
      },
    });
  console.log(`✅ POS: ${pos.name}`);
  console.log(`   posId = ${pos.id}  (use em /bar/[posId]?eventId=${event.id})`);

  const category = await prisma.productCategory.findFirst({ where: { eventId: event.id, name: 'Cervejas' } })
    ?? await prisma.productCategory.create({
      data: { eventId: event.id, name: 'Cervejas', icon: '🍺', color: '#f59e0b', sortOrder: 1 },
    });

  const existingProducts = await prisma.pOSProduct.count({ where: { posId: pos.id } });
  if (existingProducts === 0) {
    await prisma.pOSProduct.createMany({
      data: [
        { posId: pos.id, name: 'Cerveja Long Neck', category: ProductCategoryEnum.beer, priceCents: 1500, stockQty: 200, sortOrder: 1, isAvailable: true },
        { posId: pos.id, name: 'Água', category: ProductCategoryEnum.water, priceCents: 600, sortOrder: 2, isAvailable: true },
        { posId: pos.id, name: 'Refrigerante', category: ProductCategoryEnum.soft_drink, priceCents: 800, stockQty: 100, sortOrder: 3, isAvailable: true },
        { posId: pos.id, name: 'Caipirinha', category: ProductCategoryEnum.cocktail, priceCents: 2500, sortOrder: 4, isAvailable: true },
      ],
    });
    console.log(`✅ 4 produtos no cardápio`);
  }

  const operatorPinHash = await bcrypt.hash('1234', 12);
  const existingOperator = await prisma.pOSOperator.findFirst({ where: { posId: pos.id } });
  if (!existingOperator) {
    await prisma.pOSOperator.create({
      data: { posId: pos.id, pinHash: operatorPinHash },
    });
  }
  console.log(`✅ Operator: Bartender Carlos  (PIN: 1234)`);

  // ============================================================
  // 6. CashlessWallet pro consumidor — R$ 200 inicial
  // ============================================================
  const wallet = await prisma.cashlessWallet.upsert({
    where: { eventId_userId: { eventId: event.id, userId: consumer.id } },
    update: { balanceCents: 20000 },
    create: {
      eventId: event.id,
      userId: consumer.id,
      walletType: WalletType.digital,
      walletCode: 'WALLET-MARIA-001',
      balanceCents: 20000,
    },
  });
  console.log(`✅ Wallet: ${consumer.name} — saldo R$ ${(wallet.balanceCents / 100).toFixed(2)}`);

  // ============================================================
  // 7. VenueMap — 4 zonas
  // ============================================================
  const zones = [
    { id: 'palco-principal', name: 'Palco Principal', polygon: [[60, 10], [180, 10], [180, 80], [60, 80]], capacity: 3000, kind: 'stage' },
    { id: 'bar-pista', name: 'Bar Pista', polygon: [[20, 100], [80, 100], [80, 140], [20, 140]], capacity: 200, kind: 'bar' },
    { id: 'area-vip', name: 'Área VIP', polygon: [[150, 100], [220, 100], [220, 160], [150, 160]], capacity: 500, kind: 'vip' },
    { id: 'banheiros', name: 'Banheiros', polygon: [[90, 150], [140, 150], [140, 180], [90, 180]], kind: 'bathroom' },
  ];
  await prisma.venueMap.upsert({
    where: { eventId: event.id },
    update: { zones: zones as unknown as object },
    create: { eventId: event.id, zones: zones as unknown as object },
  });
  console.log(`✅ VenueMap: 4 zonas (palco / bar / VIP / banheiros)`);

  // ============================================================
  // 8. Achievements catalog
  // ============================================================
  const achievements = [
    { key: 'first_event', name: 'Estreante', description: 'Foi a 1 evento', tier: 1 },
    { key: 'five_events', name: 'Frequentador', description: 'Foi a 5 eventos', tier: 2 },
    { key: 'ten_events', name: 'Insider', description: 'Foi a 10 eventos', tier: 3 },
    { key: 'first_purchase', name: 'Primeira compra', description: 'Comprou seu 1º ingresso', tier: 1 },
    { key: 'big_spender', name: 'Mão Aberta', description: 'Recarregou R$ 500+ no cashless', tier: 2 },
    { key: 'social_butterfly', name: 'Sociável', description: 'Tem 10+ amigos no app', tier: 2 },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
  console.log(`✅ ${achievements.length} achievements no catálogo`);

  // ============================================================
  // Resumo
  // ============================================================
  console.log('\n🎉 Seed concluído!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('  CREDENCIAIS DE LOGIN');
  console.log('═══════════════════════════════════════════════');
  console.log('  Admin global:   admin@pulsepass.com.br / Admin@123456');
  console.log('  Produtor (org): produtor@example.com    / Producer@123456');
  console.log('  Cliente:        usuario@example.com     / Consumer@123456');
  console.log('  Operador PIN:   1234  (Bartender Carlos no Bar Principal)');
  console.log('═══════════════════════════════════════════════');
  console.log('  IDs PRA TESTAR DEEP-LINKS MOBILE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  organizationId = ${org.id}`);
  console.log(`  eventId        = ${event.id}`);
  console.log(`  posId          = ${pos.id}`);
  console.log(`  walletCode     = ${wallet.walletCode}`);
  console.log('═══════════════════════════════════════════════');
  console.log('  URLs RÁPIDAS');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Web home:             http://localhost:5173/`);
  console.log(`  Event detail:         http://localhost:5173/event/${event.slug}`);
  console.log(`  Admin cashless hub:   http://localhost:5173/admin/orgs/${org.id}/events/${event.id}/cashless`);
  console.log(`  Admin orders queue:   http://localhost:5173/admin/orgs/${org.id}/events/${event.id}/cashless/orders`);
  console.log(`  Admin venue map:      http://localhost:5173/admin/orgs/${org.id}/events/${event.id}/venue-map`);
  console.log(`  Mobile bar (deep):    pulsepass://bar/${pos.id}?eventId=${event.id}`);
  console.log(`  Mobile venue map:     pulsepass://venue-map/${event.id}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
