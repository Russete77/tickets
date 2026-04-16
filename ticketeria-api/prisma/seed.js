"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // ============================
    // Admin user
    // ============================
    const adminPassword = await bcryptjs_1.default.hash('Admin@123456', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ticketeria.com.br' },
        update: {},
        create: {
            email: 'admin@ticketeria.com.br',
            cpf: '000.000.000-00',
            name: 'Admin Ticketeria',
            passwordHash: adminPassword,
            role: client_1.UserRole.admin,
            emailVerified: true,
        },
    });
    console.log(`✅ Admin: ${admin.email}`);
    // ============================
    // Producer user
    // ============================
    const producerPassword = await bcryptjs_1.default.hash('Producer@123456', 12);
    const producer = await prisma.user.upsert({
        where: { email: 'produtor@example.com' },
        update: {},
        create: {
            email: 'produtor@example.com',
            cpf: '111.111.111-11',
            name: 'João Produtor',
            phone: '11999999999',
            passwordHash: producerPassword,
            role: client_1.UserRole.producer,
            emailVerified: true,
        },
    });
    console.log(`✅ Producer: ${producer.email}`);
    // ============================
    // Consumer user
    // ============================
    const consumerPassword = await bcryptjs_1.default.hash('Consumer@123456', 12);
    const consumer = await prisma.user.upsert({
        where: { email: 'usuario@example.com' },
        update: {},
        create: {
            email: 'usuario@example.com',
            cpf: '222.222.222-22',
            name: 'Maria Consumidora',
            phone: '11888888888',
            passwordHash: consumerPassword,
            role: client_1.UserRole.consumer,
            emailVerified: true,
        },
    });
    console.log(`✅ Consumer: ${consumer.email}`);
    // ============================
    // Sample event
    // ============================
    const nextSaturday = new Date();
    nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay()));
    nextSaturday.setHours(22, 0, 0, 0);
    const eventEnd = new Date(nextSaturday);
    eventEnd.setHours(4, 0, 0, 0);
    eventEnd.setDate(eventEnd.getDate() + 1);
    const event = await prisma.event.upsert({
        where: { slug: 'festival-eletronica-sp-2026' },
        update: {},
        create: {
            producerId: producer.id,
            title: 'Festival Eletrônica SP 2026',
            slug: 'festival-eletronica-sp-2026',
            description: '<p>O maior festival de música eletrônica de São Paulo. 12 horas de música, 4 palcos, mais de 30 DJs nacionais e internacionais.</p>',
            shortDescription: 'O maior festival de música eletrônica de SP. 12h de música, 4 palcos, 30+ DJs.',
            category: client_1.EventCategory.festival,
            status: client_1.EventStatus.published,
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
            dressCode: 'Confortável',
            isOpenBar: true,
            lineup: JSON.parse('["DJ Alpha", "DJ Beta", "DJ Gamma", "MC Delta", "DJ Epsilon"]'),
            rules: 'Proibida a entrada de menores de 18 anos. Documento com foto obrigatório.',
            maxTicketsPerCpf: 4,
        },
    });
    console.log(`✅ Event: ${event.title}`);
    // ============================
    // Ticket batches
    // ============================
    const batches = [
        {
            eventId: event.id,
            name: '1º Lote',
            description: 'Lote promocional de lançamento',
            priceCents: 8000,
            quantity: 1000,
            sortOrder: 1,
            type: client_1.BatchType.regular,
            isVisible: true,
        },
        {
            eventId: event.id,
            name: '2º Lote',
            description: 'Lote regular',
            priceCents: 12000,
            quantity: 2000,
            sortOrder: 2,
            type: client_1.BatchType.regular,
            isVisible: false,
        },
        {
            eventId: event.id,
            name: 'VIP',
            description: 'Acesso VIP com open bar premium e área exclusiva',
            priceCents: 25000,
            quantity: 500,
            sortOrder: 3,
            type: client_1.BatchType.vip,
            isVisible: true,
        },
        {
            eventId: event.id,
            name: 'Camarote',
            description: 'Camarote privativo para até 10 pessoas com garçom exclusivo',
            priceCents: 50000,
            quantity: 50,
            sortOrder: 4,
            type: client_1.BatchType.camarote,
            isVisible: true,
        },
    ];
    for (const batch of batches) {
        await prisma.ticketBatch.create({ data: batch });
    }
    console.log(`✅ ${batches.length} lotes criados`);
    console.log('\n🎉 Seed concluído!');
    console.log('\nCredenciais de teste:');
    console.log('  Admin:    admin@ticketeria.com.br / Admin@123456');
    console.log('  Produtor: produtor@example.com / Producer@123456');
    console.log('  Usuário:  usuario@example.com / Consumer@123456');
}
main()
    .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map