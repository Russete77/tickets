import { http, HttpResponse, delay } from 'msw';
import {
  getWeekendEvents,
  getTrendingEvents,
  getRecommendedEvents,
  getEventsByCategory,
  searchEvents,
  getEventBySlug,
  mockLogin,
  mockRegister,
} from './data';

// Latência simulada (ms) para dar sensação realista
const LAT = 350;

const BASE = 'http://localhost:3333/api/v1';

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { email: string; password: string };
    const result = mockLogin(body.email, body.password);

    if (!result) {
      return HttpResponse.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: result }, { status: 200 });
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as {
      name: string;
      email: string;
      cpf: string;
      phone: string;
      password: string;
    };
    const result = mockRegister(body);

    if ('error' in result) {
      return HttpResponse.json({ error: result.error }, { status: 409 });
    }

    return HttpResponse.json({ data: result }, { status: 201 });
  }),

  http.post(`${BASE}/auth/logout`, async () => {
    await delay(100);
    return HttpResponse.json({ data: null }, { status: 200 });
  }),

  http.post(`${BASE}/auth/forgot-password`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { message: 'Email enviado' } }, { status: 200 });
  }),

  http.post(`${BASE}/auth/reset-password`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { message: 'Senha alterada com sucesso' } }, { status: 200 });
  }),

  // ── Eventos ─────────────────────────────────────────────────────────────

  http.get(`${BASE}/events/weekend`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: getWeekendEvents() });
  }),

  http.get(`${BASE}/events/trending`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: getTrendingEvents() });
  }),

  // Aceita tanto /recommended quanto /recommendations
  http.get(`${BASE}/events/recommendation*`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: getRecommendedEvents() });
  }),

  http.get(`${BASE}/events/search`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const cursor = url.searchParams.get('cursor') || undefined;
    const result = searchEvents(q, category, cursor);
    return HttpResponse.json({ data: result });
  }),

  // GET /events/:slug  — retorna Event completo (com batches, gallery, reviews)
  // IMPORTANT: Must come BEFORE the generic /events handler (MSW first-match wins)
  http.get(`${BASE}/events/:slug`, async ({ params }) => {
    await delay(LAT);
    const base = getEventBySlug(params.slug as string);

    if (!base) {
      return HttpResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const fullEvent = {
      ...base,
      endDate: base.startDate,
      doorsOpenAt: base.startDate,
      venue: {
        id: `venue-${base.id}`,
        name: base.venue.name,
        address: `Av. Principal, 1000`,
        city: base.venue.city,
        state: base.venue.state,
        coordinates: { lat: -23.55, lng: -46.63 },
      },
      ageRating: '16',
      dressCode: undefined,
      openBar: base.category === 'festas',
      lineup: [
        { name: 'Artista Principal', role: 'Headliner' },
        { name: 'Artista Convidado', role: 'Suporte' },
      ],
      timeline: [
        { time: '18:00', activity: 'Abertura dos portões' },
        { time: '20:00', activity: 'Show de abertura' },
        { time: '22:00', activity: 'Show principal' },
        { time: '00:00', activity: 'Encerramento' },
      ],
      batches: [
        {
          id: `${base.id}-batch-1`,
          name: '1º Lote — Pista',
          type: 'normal' as const,
          price: base.currentBatchPrice,
          quantity: 1000,
          sold: 820,
          endsAt: base.startDate,
          maxTicketsPerCpf: 4,
        },
        {
          id: `${base.id}-batch-2`,
          name: 'VIP',
          type: 'vip' as const,
          price: Math.round(base.currentBatchPrice * 2.5),
          quantity: 200,
          sold: 90,
          endsAt: base.startDate,
          maxTicketsPerCpf: 2,
        },
        {
          id: `${base.id}-batch-3`,
          name: 'Camarote Premium',
          type: 'camarote' as const,
          price: Math.round(base.currentBatchPrice * 4),
          quantity: 50,
          sold: 50, // esgotado
          endsAt: base.startDate,
          maxTicketsPerCpf: 2,
        },
      ],
      gallery: [
        { url: base.coverImage, alt: `${base.title} — foto 1` },
        { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', alt: `${base.title} — foto 2` },
        { url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80', alt: `${base.title} — foto 3` },
      ],
      rating: base.rating ?? 4.5,
      reviewCount: 128,
      reviews: [
        {
          id: 'rev-001',
          userId: 'usr-a',
          userName: 'João Silva',
          userAvatar: 'https://i.pravatar.cc/48?img=1',
          date: '2025-02-10T14:00:00Z',
          rating: 5,
          comment: 'Experiência incrível! Organização perfeita e show inesquecível.',
          ratings: { organization: 5, sound: 5, bar: 4, experience: 5 },
        },
        {
          id: 'rev-002',
          userId: 'usr-b',
          userName: 'Maria Santos',
          userAvatar: 'https://i.pravatar.cc/48?img=5',
          date: '2025-02-08T10:00:00Z',
          rating: 4,
          comment: 'Muito bom! Fila um pouco grande na entrada mas o show compensou tudo.',
          ratings: { organization: 3, sound: 5, bar: 4, experience: 5 },
        },
      ],
      isFavorite: false,
    };

    return HttpResponse.json({ data: fullEvent });
  }),

  // GET /events?category=shows&limit=6 (CategorySection)
  http.get(`${BASE}/events`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'todos';
    const limit = parseInt(url.searchParams.get('limit') || '6', 10);
    return HttpResponse.json({ data: getEventsByCategory(category, limit) });
  }),

  // ── Search suggestions ──────────────────────────────────────────────────

  http.get(`${BASE}/search/suggestions`, async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    if (!q || q.length < 2) return HttpResponse.json({ data: [] });

    const { events } = searchEvents(q, '', undefined);
    const suggestions = events.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      city: e.venue.city,
      slug: e.slug,
    }));

    return HttpResponse.json({ data: suggestions });
  }),

  // ── Admin dashboard ─────────────────────────────────────────────────────

  http.get(`${BASE}/admin/dashboard`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';

    const multiplier = period === '7d' ? 0.25 : period === '90d' ? 3 : 1;

    return HttpResponse.json({
      data: {
        revenue: { total: Math.round(28745000 * multiplier), growth: 12.5 }, // em centavos
        tickets: { total: Math.round(3842 * multiplier), growth: 8.2 },
        events: { total: 47, active: 12 },
        users: { total: Math.round(12890 * multiplier), newThisMonth: Math.round(340 * multiplier) },
        revenueChart: [
          { label: 'Jan', value: Math.round(4200000 * multiplier) },
          { label: 'Fev', value: Math.round(3800000 * multiplier) },
          { label: 'Mar', value: Math.round(5500000 * multiplier) },
          { label: 'Abr', value: Math.round(6100000 * multiplier) },
          { label: 'Mai', value: Math.round(4800000 * multiplier) },
          { label: 'Jun', value: Math.round(7200000 * multiplier) },
        ],
        topEvents: [
          { id: 'evt-001', title: 'Lollapalooza Brasil', sold: 89000, capacity: 131000, revenue: Math.round(12430000 * multiplier) },
          { id: 'evt-003', title: 'Rock in Rio 2025',    sold: 96800, capacity: 100000, revenue: Math.round(9760000 * multiplier) },
          { id: 'evt-012', title: 'Ultra Music Festival', sold: 24400, capacity: 30000,  revenue: Math.round(4510000 * multiplier) },
        ],
        recentOrders: [
          { id: 'ord-001', customerName: 'João Silva',     eventTitle: 'Lollapalooza',  amount: 79000, status: 'confirmed', createdAt: '2025-04-09T10:00:00Z' },
          { id: 'ord-002', customerName: 'Maria Santos',   eventTitle: 'Rock in Rio',   amount: 45000, status: 'pending',   createdAt: '2025-04-09T09:30:00Z' },
          { id: 'ord-003', customerName: 'Carlos Oliveira',eventTitle: 'Ultra Music',   amount: 38000, status: 'confirmed', createdAt: '2025-04-08T18:45:00Z' },
          { id: 'ord-004', customerName: 'Ana Costa',      eventTitle: 'Coldplay Tour', amount: 58000, status: 'cancelled', createdAt: '2025-04-08T14:20:00Z' },
          { id: 'ord-005', customerName: 'Pedro Lima',     eventTitle: 'Maroon 5',      amount: 34000, status: 'confirmed', createdAt: '2025-04-07T21:10:00Z' },
        ],
      },
    });
  }),

  // ── Admin: Eventos ──────────────────────────────────────────────────────

  http.get(`${BASE}/admin/events`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'all';
    const page   = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit  = parseInt(url.searchParams.get('limit') ?? '8', 10);
    const { MOCK_EVENTS } = await import('./data');
    let events = MOCK_EVENTS.map((e) => ({
      id: e.id, title: e.title, category: e.category,
      startDate: e.startDate, venue: e.venue,
      currentBatchPrice: e.currentBatchPrice,
      sold: e.sold ?? 0, totalCapacity: e.totalCapacity ?? 1000,
      organizer: e.organizer.name,
      status: (e.sold ?? 0) >= (e.totalCapacity ?? 1000) * 0.98 ? 'ended' : 'published',
    }));
    if (search) events = events.filter(e => e.title.toLowerCase().includes(search) || e.venue.city.toLowerCase().includes(search));
    if (status !== 'all') events = events.filter(e => e.status === status);
    const total = events.length;
    return HttpResponse.json({ data: { events: events.slice((page - 1) * limit, page * limit), total } });
  }),

  // ── Admin: Pedidos ──────────────────────────────────────────────────────

  http.get(`${BASE}/admin/orders`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'all';
    const page   = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit  = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const CUSTOMERS = [
      { name: 'João Silva', email: 'joao@email.com' }, { name: 'Maria Santos', email: 'maria@email.com' },
      { name: 'Carlos Oliveira', email: 'carlos@email.com' }, { name: 'Ana Costa', email: 'ana@email.com' },
      { name: 'Pedro Lima', email: 'pedro@email.com' }, { name: 'Fernanda Melo', email: 'fernanda@email.com' },
      { name: 'Ricardo Alves', email: 'ricardo@email.com' }, { name: 'Juliana Nunes', email: 'juliana@email.com' },
    ];
    const EVENTS = ['Lollapalooza', 'Rock in Rio', 'Ultra Music', 'Coldplay Tour', 'Maroon 5'];
    const STATUSES = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'refunded'];
    const METHODS: Array<'pix' | 'credit_card' | 'boleto'> = ['pix', 'credit_card', 'credit_card', 'boleto', 'pix'];
    const allOrders = Array.from({ length: 48 }, (_, i) => {
      const c = CUSTOMERS[i % CUSTOMERS.length];
      const d = new Date(2025, 3, 9 - Math.floor(i / 4), 10 + (i % 12));
      return {
        id: `ord-${String(i + 1).padStart(4, '0')}`, customerName: c.name, customerEmail: c.email,
        eventTitle: EVENTS[i % EVENTS.length], items: (i % 3) + 1,
        amount: 20000 + (i * 7919) % 60000, paymentMethod: METHODS[i % METHODS.length],
        status: STATUSES[i % STATUSES.length], createdAt: d.toISOString(),
      };
    });
    let filtered = allOrders;
    if (search) filtered = filtered.filter(o => o.customerName.toLowerCase().includes(search) || o.eventTitle.toLowerCase().includes(search));
    if (status !== 'all') filtered = filtered.filter(o => o.status === status);
    const total = filtered.length;
    return HttpResponse.json({ data: { orders: filtered.slice((page - 1) * limit, page * limit), total } });
  }),

  // ── Admin: Usuários ─────────────────────────────────────────────────────

  http.get(`${BASE}/admin/users`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const role   = url.searchParams.get('role') ?? 'all';
    const page   = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit  = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const NAMES = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima', 'Fernanda Melo', 'Ricardo Alves', 'Juliana Nunes', 'Bruno Carvalho', 'Camila Rocha'];
    const ROLES: Array<'user' | 'organizer' | 'admin'> = ['user', 'user', 'user', 'user', 'organizer', 'user', 'user', 'admin', 'user', 'organizer'];
    const allUsers = Array.from({ length: 50 }, (_, i) => {
      const name = NAMES[i % NAMES.length];
      const created = new Date(2024, i % 12, (i % 28) + 1);
      const lastLogin = new Date(2025, 3, 9 - (i % 30));
      return {
        id: `usr-${String(i + 1).padStart(4, '0')}`,
        name: i >= 10 ? `${name.split(' ')[0]} ${String.fromCharCode(65 + (i % 26))}.` : name,
        email: `${name.split(' ')[0].toLowerCase()}${i}@email.com`,
        phone: `(1${i % 9}) 9${String(i * 7919 % 100000000).padStart(8, '0')}`,
        role: ROLES[i % ROLES.length], ticketsBought: (i * 3) % 20,
        totalSpent: (i * 47000) % 500000,
        status: i % 15 === 0 ? 'suspended' : 'active',
        createdAt: created.toISOString(), lastLogin: lastLogin.toISOString(),
      };
    });
    let filtered = allUsers;
    if (search) filtered = filtered.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    if (role !== 'all') filtered = filtered.filter(u => u.role === role);
    const total = filtered.length;
    return HttpResponse.json({ data: { users: filtered.slice((page - 1) * limit, page * limit), total } });
  }),

  // ── Admin: Financeiro ───────────────────────────────────────────────────

  http.get(`${BASE}/admin/finance`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const m = url.searchParams.get('period') === '7d' ? 0.25 : url.searchParams.get('period') === '90d' ? 3 : 1;
    const gross = Math.round(28745000 * m);
    const fees  = Math.round(gross * 0.05);
    const transactions = Array.from({ length: 20 }, (_, i) => {
      const types: Array<'sale' | 'refund' | 'fee' | 'payout'> = ['sale', 'sale', 'sale', 'sale', 'refund', 'fee', 'payout'];
      const d = new Date(2025, 3, 9 - Math.floor(i / 3), 10 + (i % 12));
      const type = types[i % types.length];
      return {
        id: `txn-${String(i + 1).padStart(6, '0')}`,
        description: type === 'sale' ? 'Venda de ingresso' : type === 'refund' ? 'Reembolso solicitado' : type === 'fee' ? 'Taxa de serviço' : 'Repasse ao organizador',
        type, amount: Math.round((5000 + (i * 9371) % 80000) * m),
        paymentMethod: ['Pix', 'Cartão de crédito', 'Boleto'][i % 3],
        status: i % 7 === 0 ? 'pending' : 'completed', createdAt: d.toISOString(),
      };
    });
    return HttpResponse.json({ data: {
      summary: { grossRevenue: gross, fees, netRevenue: gross - fees, refunds: Math.round(gross * 0.02), pendingPayout: Math.round(gross * 0.3) },
      byMethod: [
        { method: 'Pix', total: Math.round(gross * 0.52), count: Math.round(1200 * m) },
        { method: 'Cartão', total: Math.round(gross * 0.38), count: Math.round(870 * m) },
        { method: 'Boleto', total: Math.round(gross * 0.10), count: Math.round(230 * m) },
      ],
      transactions, total: transactions.length,
    }});
  }),

  // ── Admin: Finance Balance (nova endpoint) ────────────────────────────────

  http.get(`${BASE}/admin/finance/balance`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';
    const m = period === '7d' ? 0.25 : period === '90d' ? 3 : 1;
    const gross = Math.round(28745000 * m);
    const fees = Math.round(gross * 0.05);
    const netRevenue = gross - fees;
    const available = Math.round(netRevenue * 0.7);
    const pending = Math.round(netRevenue * 0.3);

    const transactions = Array.from({ length: 15 }, (_, i) => {
      const types: Array<'entrada' | 'saída' | 'split'> = ['entrada', 'entrada', 'entrada', 'saída', 'split'];
      const d = new Date(2025, 3, 9 - Math.floor(i / 2), 10 + (i % 12));
      const type = types[i % types.length];
      return {
        id: `txn-${String(i + 1).padStart(6, '0')}`,
        description: type === 'entrada' ? 'Venda de ingresso' : type === 'saída' ? 'Saque processado' : 'Split com organizador',
        type,
        amount: Math.round((8000 + (i * 5371) % 60000) * m),
        paymentMethod: ['Pix', 'Cartão de crédito', 'Boleto'][i % 3],
        eventName: ['Lollapalooza', 'Rock in Rio', 'Ultra Music', 'Coldplay'][i % 4],
        status: i % 5 === 0 ? 'pending' : 'completed',
        createdAt: d.toISOString(),
      };
    });

    const payouts = Array.from({ length: 8 }, (_, i) => {
      const statuses: Array<'pending' | 'approved' | 'completed' | 'rejected'> = [
        'completed', 'completed', 'completed', 'approved', 'pending', 'pending', 'rejected', 'completed',
      ];
      const d = new Date(2025, 3, 9 - i * 3);
      return {
        id: `payout-${String(i + 1).padStart(4, '0')}`,
        amount: Math.round((15000 + (i * 12500) % 85000) * m),
        method: ['pix', 'ted', 'deposito'][i % 3] as 'pix' | 'ted' | 'deposito',
        status: statuses[i],
        requestedAt: d.toISOString(),
        completedAt: statuses[i] === 'completed' ? new Date(d.getTime() + 1000 * 60 * 60 * 2).toISOString() : undefined,
      };
    });

    const revenueByEvent = [
      { id: 'evt-001', name: 'Lollapalooza Brasil', ticketsSold: 2450, grossRevenue: 9800000, platformFee: 490000, netRevenue: 9310000 },
      { id: 'evt-003', name: 'Rock in Rio 2025', ticketsSold: 1820, grossRevenue: 7280000, platformFee: 364000, netRevenue: 6916000 },
      { id: 'evt-012', name: 'Ultra Music Festival', ticketsSold: 680, grossRevenue: 2720000, platformFee: 136000, netRevenue: 2584000 },
      { id: 'evt-005', name: 'Coldplay Tour', ticketsSold: 1200, grossRevenue: 4800000, platformFee: 240000, netRevenue: 4560000 },
      { id: 'evt-008', name: 'Festa Eletrônica XYZ', ticketsSold: 890, grossRevenue: 2670000, platformFee: 133500, netRevenue: 2536500 },
    ];

    return HttpResponse.json({
      data: {
        balance: { available, pending, total: netRevenue },
        summary: {
          grossRevenue: gross,
          fees,
          netRevenue,
          refunds: Math.round(gross * 0.02),
          pendingPayout: pending,
        },
        byMethod: [
          { method: 'Pix', total: Math.round(gross * 0.52), count: Math.round(1200 * m) },
          { method: 'Cartão', total: Math.round(gross * 0.38), count: Math.round(870 * m) },
          { method: 'Boleto', total: Math.round(gross * 0.10), count: Math.round(230 * m) },
        ],
        transactions,
        payouts,
        revenueByEvent,
        total: transactions.length,
      },
    });
  }),

  // ── Admin: Finance Transactions (nova endpoint) ──────────────────────────

  http.get(`${BASE}/admin/finance/transactions`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';
    const m = period === '7d' ? 0.25 : period === '90d' ? 3 : 1;

    const transactions = Array.from({ length: 20 }, (_, i) => {
      const types: Array<'entrada' | 'saída' | 'split'> = ['entrada', 'entrada', 'entrada', 'saída', 'split'];
      const d = new Date(2025, 3, 9 - Math.floor(i / 2), 10 + (i % 12));
      const type = types[i % types.length];
      return {
        id: `txn-${String(i + 1).padStart(6, '0')}`,
        description: type === 'entrada' ? 'Venda de ingresso' : type === 'saída' ? 'Saque processado' : 'Split com organizador',
        type,
        amount: Math.round((8000 + (i * 5371) % 60000) * m),
        paymentMethod: ['Pix', 'Cartão de crédito', 'Boleto'][i % 3],
        eventName: ['Lollapalooza', 'Rock in Rio', 'Ultra Music', 'Coldplay'][i % 4],
        status: i % 5 === 0 ? 'pending' : 'completed',
        createdAt: d.toISOString(),
      };
    });

    return HttpResponse.json({ data: { transactions, total: transactions.length } });
  }),

  // ── Admin: Finance Payouts (nova endpoint) ────────────────────────────────

  http.get(`${BASE}/admin/finance/payouts`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';
    const m = period === '7d' ? 0.25 : period === '90d' ? 3 : 1;

    const payouts = Array.from({ length: 12 }, (_, i) => {
      const statuses: Array<'pending' | 'approved' | 'completed' | 'rejected'> = [
        'completed', 'completed', 'completed', 'approved', 'pending', 'pending', 'rejected', 'completed', 'completed', 'approved', 'pending', 'completed',
      ];
      const d = new Date(2025, 3, 9 - i * 2);
      return {
        id: `payout-${String(i + 1).padStart(4, '0')}`,
        amount: Math.round((15000 + (i * 12500) % 85000) * m),
        method: ['pix', 'ted', 'deposito'][i % 3] as 'pix' | 'ted' | 'deposito',
        status: statuses[i],
        requestedAt: d.toISOString(),
        completedAt: statuses[i] === 'completed' ? new Date(d.getTime() + 1000 * 60 * 60 * 2).toISOString() : undefined,
      };
    });

    return HttpResponse.json({ data: { payouts, total: payouts.length } });
  }),

  // ── Admin: Relatórios ───────────────────────────────────────────────────

  http.get(`${BASE}/admin/reports`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const m = url.searchParams.get('period') === '7d' ? 0.25 : url.searchParams.get('period') === '90d' ? 3 : 1;
    return HttpResponse.json({ data: {
      salesByCategory: [
        { category: 'shows',       sales: Math.round(2100 * m), revenue: Math.round(14700000 * m) },
        { category: 'festas',      sales: Math.round(980 * m),  revenue: Math.round(4900000 * m) },
        { category: 'eletrônica',  sales: Math.round(760 * m),  revenue: Math.round(5320000 * m) },
        { category: 'tecnologia',  sales: Math.round(430 * m),  revenue: Math.round(2150000 * m) },
        { category: 'forró',       sales: Math.round(310 * m),  revenue: Math.round(1240000 * m) },
        { category: 'gastronomia', sales: Math.round(180 * m),  revenue: Math.round(630000 * m) },
      ],
      salesByState: [
        { state: 'São Paulo — SP',      sales: Math.round(1800 * m), revenue: Math.round(12600000 * m) },
        { state: 'Rio de Janeiro — RJ', sales: Math.round(980 * m),  revenue: Math.round(7350000 * m) },
        { state: 'Minas Gerais — MG',   sales: Math.round(420 * m),  revenue: Math.round(2940000 * m) },
        { state: 'Bahia — BA',          sales: Math.round(310 * m),  revenue: Math.round(1860000 * m) },
        { state: 'Pernambuco — PE',     sales: Math.round(250 * m),  revenue: Math.round(1250000 * m) },
      ],
      topOrganizers: [
        { id: 'org-002', name: 'T4F Entretenimento', events: 8, revenue: Math.round(9800000 * m), rating: 4.8 },
        { id: 'org-001', name: 'C3 Presents',        events: 4, revenue: Math.round(7200000 * m), rating: 4.9 },
        { id: 'org-003', name: 'Rock in Rio',        events: 2, revenue: Math.round(5500000 * m), rating: 4.9 },
        { id: 'org-011', name: 'Ultra Brazil',       events: 3, revenue: Math.round(3400000 * m), rating: 4.7 },
        { id: 'org-005', name: 'Campus Party',       events: 5, revenue: Math.round(1600000 * m), rating: 4.3 },
      ],
      conversionFunnel: [
        { stage: 'Visitaram a página do evento', count: Math.round(84000 * m), pct: 100 },
        { stage: 'Clicaram em comprar',          count: Math.round(32000 * m), pct: 38  },
        { stage: 'Iniciaram checkout',           count: Math.round(14000 * m), pct: 17  },
        { stage: 'Concluíram pagamento',         count: Math.round(9800 * m),  pct: 12  },
      ],
    }});
  }),

  // ── Tickets do usuário (/tickets/mine) ──────────────────────────────────

  http.get(`${BASE}/tickets/mine`, async () => {
    await delay(LAT);
    return HttpResponse.json({
      data: [
        {
          id: 'tkt-001',
          eventId: 'evt-001',
          eventTitle: 'Lollapalooza Brasil 2025',
          eventCover: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80',
          eventDate: '2025-03-28T12:00:00-03:00',
          venueName: 'Autódromo de Interlagos',
          venueCity: 'São Paulo',
          batchName: '1º Lote — Pista',
          batchType: 'normal',
          holderName: 'Usuário Demo',
          status: 'active',
          totpSecret: 'JBSWY3DPEHPK3PXP',
          purchaseDate: '2025-01-15T10:22:00Z',
          orderId: 'ord-001',
        },
        {
          id: 'tkt-002',
          eventId: 'evt-012',
          eventTitle: 'Ultra Music Festival Brasil',
          eventCover: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80',
          eventDate: '2025-05-10T15:00:00-03:00',
          venueName: 'Sambódromo do Anhembi',
          venueCity: 'São Paulo',
          batchName: 'VIP',
          batchType: 'vip',
          holderName: 'Usuário Demo',
          status: 'active',
          totpSecret: 'KRUGKIDROVUWG2ZA',
          purchaseDate: '2025-02-01T14:55:00Z',
          orderId: 'ord-002',
        },
        {
          id: 'tkt-003',
          eventId: 'evt-003',
          eventTitle: 'Rock in Rio 2025',
          eventCover: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80',
          eventDate: '2025-09-19T14:00:00-03:00',
          venueName: 'Parque Olímpico',
          venueCity: 'Rio de Janeiro',
          batchName: 'Pista',
          batchType: 'normal',
          holderName: 'Usuário Demo',
          status: 'used',
          totpSecret: 'MFRA24YTMJQXIZLT',
          purchaseDate: '2024-11-20T09:10:00Z',
          orderId: 'ord-003',
        },
      ],
    });
  }),

  // ── Perfil do usuário ────────────────────────────────────────────────────

  http.get(`${BASE}/users/me`, async () => {
    await delay(LAT);
    return HttpResponse.json({
      data: {
        id: 'usr-current',
        name: 'Usuário Demo',
        email: 'demo@ticketeria.com.br',
        role: 'user',
        avatar: null,
      },
    });
  }),

  // ── Check-in ────────────────────────────────────────────────────────────

  http.post(`${BASE}/checkin/validate`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { qr_data: string; event_id: string };
    const { qr_data } = body;

    // Mock validation logic
    const tickets = [
      { id: 'tkt-001', holderName: 'João Silva', batchType: '1º Lote', ticketNumber: 'TKT-001-2025' },
      { id: 'tkt-002', holderName: 'Maria Santos', batchType: 'VIP', ticketNumber: 'TKT-002-2025' },
      { id: 'tkt-003', holderName: 'Carlos Oliveira', batchType: 'Camarote', ticketNumber: 'TKT-003-2025' },
    ];

    // Already used tickets
    const usedTickets = new Set(['tkt-003-demo-qr-code']);

    // Find ticket
    const ticket = tickets.find((t) => qr_data.includes(t.id) || qr_data === 'tkt-001-demo-qr-code');

    if (!ticket) {
      return HttpResponse.json({
        data: {
          valid: false,
          status: 'invalid' as const,
          reason: 'Ingresso não encontrado no sistema',
        },
      });
    }

    // Check if already used
    if (usedTickets.has(qr_data)) {
      return HttpResponse.json({
        data: {
          valid: false,
          status: 'invalid' as const,
          reason: 'Este ingresso já foi utilizado',
          holderName: ticket.holderName,
        },
      });
    }

    // Random warning for some tickets
    if (Math.random() < 0.1) {
      return HttpResponse.json({
        data: {
          valid: true,
          status: 'warning' as const,
          reason: 'TOTP expirado — verificação manual recomendada',
          holderName: ticket.holderName,
          batchType: ticket.batchType,
          ticketNumber: ticket.ticketNumber,
        },
      });
    }

    // Valid ticket
    return HttpResponse.json({
      data: {
        valid: true,
        status: 'valid' as const,
        holderName: ticket.holderName,
        batchType: ticket.batchType,
        ticketNumber: ticket.ticketNumber,
      },
    });
  }),

  http.get(`${BASE}/checkin/stats/:eventId`, async ({ params }) => {
    await delay(LAT);
    const eventId = params.eventId as string;

    // Mock stats based on event
    const eventStats: Record<string, { total: number; checkedIn: number }> = {
      'evt-001': { total: 5000, checkedIn: 3847 },
      'evt-002': { total: 2000, checkedIn: 1234 },
      'evt-003': { total: 1500, checkedIn: 945 },
      'evt-012': { total: 3000, checkedIn: 2156 },
    };

    const stats = eventStats[eventId] || { total: 1000, checkedIn: 342 };
    const percentage = Math.round((stats.checkedIn / stats.total) * 100);
    const remaining = stats.total - stats.checkedIn;

    return HttpResponse.json({
      data: {
        total: stats.total,
        checkedIn: stats.checkedIn,
        remaining,
        percentage,
      },
    });
  }),

  // ── Admin: Criar Evento ─────────────────────────────────────────────────

  http.post(`${BASE}/events`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    const newEvent = {
      id: `evt-${Date.now()}`,
      ...body,
      status: 'published',
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: newEvent }, { status: 201 });
  }),

  // ── Admin: Guest Lists ──────────────────────────────────────────────────

  http.get(`${BASE}/guest-lists`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const lists = [
      { id: 'gl-001', eventId, name: 'Lista VIP', type: 'vip', maxGuests: 100, totalEntries: 68, checkedIn: 52, createdAt: '2025-03-01T10:00:00Z' },
      { id: 'gl-002', eventId, name: 'Lista Imprensa', type: 'press', maxGuests: 30, totalEntries: 22, checkedIn: 18, createdAt: '2025-03-02T10:00:00Z' },
      { id: 'gl-003', eventId, name: 'Lista Backstage', type: 'backstage', maxGuests: 20, totalEntries: 15, checkedIn: 15, createdAt: '2025-03-03T10:00:00Z' },
      { id: 'gl-004', eventId, name: 'Lista Free', type: 'free', maxGuests: 200, totalEntries: 134, checkedIn: 98, createdAt: '2025-03-04T10:00:00Z' },
    ];
    return HttpResponse.json({ data: lists });
  }),

  http.post(`${BASE}/guest-lists`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `gl-${Date.now()}`, ...body, totalEntries: 0, checkedIn: 0, createdAt: new Date().toISOString() },
    }, { status: 201 });
  }),

  http.get(`${BASE}/guest-lists/:id/entries`, async ({ params }) => {
    await delay(LAT);
    const id = params.id as string;
    const entries = Array.from({ length: 12 }, (_, i) => ({
      id: `entry-${id}-${i + 1}`,
      guestListId: id,
      name: ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima', 'Fernanda Melo', 'Ricardo Alves', 'Juliana Nunes', 'Bruno Carvalho', 'Camila Rocha', 'Lucas Mendes', 'Marina Silva'][i],
      cpf: `${String(i * 12345678901 % 100000000000).padStart(11, '0')}`,
      email: `guest${i + 1}@email.com`,
      phone: `(11) 9${String(i * 9999).padStart(8, '0')}`,
      status: i < 8 ? 'checked_in' : 'pending',
      checkedInAt: i < 8 ? new Date(Date.now() - i * 600000).toISOString() : null,
    }));
    return HttpResponse.json({ data: entries });
  }),

  http.post(`${BASE}/guest-lists/:id/entries`, async ({ request, params }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `entry-${Date.now()}`, guestListId: params.id, ...body, status: 'pending', checkedInAt: null },
    }, { status: 201 });
  }),

  // ── Admin: Promoters ────────────────────────────────────────────────────

  http.get(`${BASE}/promoters`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const promoters = [
      { id: 'prm-001', eventId, name: 'Diego Souza', email: 'diego@promo.com', slug: 'diego-s', tier: 'gold', totalGuests: 420, checkIns: 385, conversionPct: 91.7, score: 98 },
      { id: 'prm-002', eventId, name: 'Larissa Mendes', email: 'larissa@promo.com', slug: 'larissa-m', tier: 'silver', totalGuests: 280, checkIns: 244, conversionPct: 87.1, score: 84 },
      { id: 'prm-003', eventId, name: 'Rafael Torres', email: 'rafael@promo.com', slug: 'rafael-t', tier: 'bronze', totalGuests: 165, checkIns: 130, conversionPct: 78.8, score: 71 },
      { id: 'prm-004', eventId, name: 'Bianca Lima', email: 'bianca@promo.com', slug: 'bianca-l', tier: 'silver', totalGuests: 310, checkIns: 276, conversionPct: 89.0, score: 88 },
      { id: 'prm-005', eventId, name: 'Marcos Pereira', email: 'marcos@promo.com', slug: 'marcos-p', tier: 'bronze', totalGuests: 98, checkIns: 71, conversionPct: 72.4, score: 59 },
    ];
    return HttpResponse.json({ data: promoters });
  }),

  http.post(`${BASE}/promoters`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `prm-${Date.now()}`, ...body, tier: 'bronze', totalGuests: 0, checkIns: 0, conversionPct: 0, score: 0 },
    }, { status: 201 });
  }),

  http.get(`${BASE}/promoters/:id`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({
      data: { id: params.id, name: 'Promoter Detail', email: 'promoter@email.com', slug: 'promoter', tier: 'gold', totalGuests: 420, checkIns: 385, conversionPct: 91.7, score: 98 },
    });
  }),

  http.get(`${BASE}/checkin/recent/:eventId`, async () => {
    await delay(LAT);

    // Generate mock recent check-ins
    const recentCheckins = [
      { id: 'chk-010', holderName: 'Ana Costa', batchType: 'VIP', ticketNumber: 'TKT-010-2025', checkedInAt: new Date(Date.now() - 30000).toISOString(), status: 'valid' },
      { id: 'chk-009', holderName: 'Ricardo Alves', batchType: '1º Lote', ticketNumber: 'TKT-009-2025', checkedInAt: new Date(Date.now() - 60000).toISOString(), status: 'valid' },
      { id: 'chk-008', holderName: 'Juliana Nunes', batchType: 'Camarote', ticketNumber: 'TKT-008-2025', checkedInAt: new Date(Date.now() - 120000).toISOString(), status: 'valid' },
      { id: 'chk-007', holderName: 'Bruno Carvalho', batchType: '1º Lote', ticketNumber: 'TKT-007-2025', checkedInAt: new Date(Date.now() - 150000).toISOString(), status: 'invalid' },
      { id: 'chk-006', holderName: 'Camila Rocha', batchType: 'VIP', ticketNumber: 'TKT-006-2025', checkedInAt: new Date(Date.now() - 180000).toISOString(), status: 'valid' },
      { id: 'chk-005', holderName: 'Fernanda Melo', batchType: '1º Lote', ticketNumber: 'TKT-005-2025', checkedInAt: new Date(Date.now() - 240000).toISOString(), status: 'valid' },
      { id: 'chk-004', holderName: 'Pedro Lima', batchType: 'Camarote', ticketNumber: 'TKT-004-2025', checkedInAt: new Date(Date.now() - 300000).toISOString(), status: 'warning' },
      { id: 'chk-003', holderName: 'Marina Silva', batchType: '1º Lote', ticketNumber: 'TKT-003-2025', checkedInAt: new Date(Date.now() - 360000).toISOString(), status: 'valid' },
      { id: 'chk-002', holderName: 'Lucas Mendes', batchType: 'VIP', ticketNumber: 'TKT-002-2025', checkedInAt: new Date(Date.now() - 420000).toISOString(), status: 'valid' },
      { id: 'chk-001', holderName: 'João Silva', batchType: '1º Lote', ticketNumber: 'TKT-001-2025', checkedInAt: new Date(Date.now() - 480000).toISOString(), status: 'valid' },
    ];

    return HttpResponse.json({ data: recentCheckins });
  }),
];
