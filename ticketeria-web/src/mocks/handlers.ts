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

  // ── Cashless / Wallet ───────────────────────────────────────────────────

  http.get(`${BASE}/cashless/balance`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { balanceCents: 5000 } });
  }),

  http.get(`${BASE}/cashless/transactions`, async () => {
    await delay(LAT);
    const DESCRIPTIONS = {
      recharge: ['Recarga via PIX', 'Recarga via cartão', 'Recarga na entrada'],
      purchase: ['Bar — Cerveja', 'Food court — Hambúrguer', 'Bar — Caipirinha', 'Merchandising — Camiseta', 'Bar — Água'],
      refund:   ['Estorno de compra', 'Reembolso de evento cancelado'],
    };
    const types: Array<'recharge' | 'purchase' | 'refund'> = [
      'recharge', 'purchase', 'purchase', 'purchase', 'recharge', 'purchase', 'refund', 'purchase', 'purchase', 'recharge',
    ];
    const transactions = Array.from({ length: 10 }, (_, i) => {
      const type = types[i % types.length];
      const descArr = DESCRIPTIONS[type];
      const d = new Date(2025, 3, 9 - Math.floor(i / 2), 18 + (i % 6));
      const amountMap: Record<string, number[]> = { recharge: [2000, 5000, 10000, 20000], purchase: [800, 1500, 2400, 3500, 500], refund: [2000, 3500] };
      const amounts = amountMap[type];
      return {
        id: `tx-${String(i + 1).padStart(4, '0')}`,
        type,
        amountCents: amounts[i % amounts.length],
        description: descArr[i % descArr.length],
        createdAt: d.toISOString(),
      };
    });
    return HttpResponse.json({ data: transactions });
  }),

  http.post(`${BASE}/cashless/recharge`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { amountCents: number };
    const amount = body.amountCents ?? 5000;
    const rnd = Array.from({ length: 36 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136${rnd}520400005303986${(amount / 100).toFixed(2).replace('.', '5406')}5802BR5925TICKETY PAGAMENTOS LTDA6009SAO PAULO6304ABCD`;
    return HttpResponse.json({
      data: {
        pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixCopyPaste)}`,
        pixCopyPaste,
      },
    });
  }),

  // ── Admin: Delete Evento ─────────────────────────────────────────────────

  http.delete(`${BASE}/events/:id`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, deleted: true } });
  }),

  // ── Admin: Toggle User Status ─────────────────────────────────────────────

  http.patch(`${BASE}/admin/users/:id/toggle-status`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, status: 'toggled' } });
  }),

  // ── Admin: Finance Payouts POST (create new payout request) ─────────────

  http.post(`${BASE}/admin/finance/payouts`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { amount: number; method: string };
    return HttpResponse.json({
      data: {
        id: `payout-${Date.now()}`,
        amount: body.amount,
        method: body.method,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  // ── Admin: Affiliates ────────────────────────────────────────────────────

  http.get(`${BASE}/admin/affiliates`, async () => {
    await delay(LAT);
    return HttpResponse.json({
      data: {
        links: [
          { id: '1', code: 'aff-tech-2024-001', eventId: 'evt-1', eventTitle: 'TechConf 2024', commissionPercentage: 10, clicks: 245, conversions: 18, totalEarned: 890.50, status: 'active', createdAt: '2024-03-15' },
          { id: '2', code: 'aff-music-fest-02', eventId: 'evt-2', eventTitle: 'Music Festival 2024', commissionPercentage: 8, clicks: 512, conversions: 42, totalEarned: 1250.75, status: 'active', createdAt: '2024-02-20' },
          { id: '3', code: 'aff-workshop-001', eventId: 'evt-3', eventTitle: 'UX Workshop Series', commissionPercentage: 12, clicks: 89, conversions: 5, totalEarned: 240.00, status: 'inactive', createdAt: '2024-01-10' },
        ],
        topAffiliates: [
          { id: 'aff-1', name: 'João Silva', email: 'joao.silva@example.com', totalSales: 5200.00, totalCommission: 520.00, conversionRate: 7.8, rank: 1 },
          { id: 'aff-2', name: 'Maria Santos', email: 'maria.santos@example.com', totalSales: 3800.00, totalCommission: 380.00, conversionRate: 6.5, rank: 2 },
          { id: 'aff-3', name: 'Pedro Oliveira', email: 'pedro.oliveira@example.com', totalSales: 2900.00, totalCommission: 232.00, conversionRate: 5.2, rank: 3 },
          { id: 'aff-4', name: 'Ana Costa', email: 'ana.costa@example.com', totalSales: 1800.00, totalCommission: 162.00, conversionRate: 4.1, rank: 4 },
          { id: 'aff-5', name: 'Carlos Martins', email: 'carlos.martins@example.com', totalSales: 1200.00, totalCommission: 96.00, conversionRate: 3.8, rank: 5 },
        ],
        commissionHistory: [
          { id: 'comm-1', date: '2024-04-08', affiliateName: 'João Silva', affiliateEmail: 'joao.silva@example.com', eventTitle: 'TechConf 2024', saleAmount: 299.90, commissionPercentage: 10, commissionValue: 29.99, status: 'paid' },
          { id: 'comm-2', date: '2024-04-07', affiliateName: 'Maria Santos', affiliateEmail: 'maria.santos@example.com', eventTitle: 'Music Festival 2024', saleAmount: 189.90, commissionPercentage: 8, commissionValue: 15.19, status: 'paid' },
          { id: 'comm-3', date: '2024-04-06', affiliateName: 'Pedro Oliveira', affiliateEmail: 'pedro.oliveira@example.com', eventTitle: 'TechConf 2024', saleAmount: 449.90, commissionPercentage: 10, commissionValue: 44.99, status: 'pending' },
          { id: 'comm-4', date: '2024-04-05', affiliateName: 'Ana Costa', affiliateEmail: 'ana.costa@example.com', eventTitle: 'UX Workshop Series', saleAmount: 99.90, commissionPercentage: 12, commissionValue: 11.99, status: 'pending' },
        ],
        stats: {
          totalAffiliates: 5,
          totalClicks: 846,
          totalConversions: 65,
          totalCommissionsCents: 4518,
        },
      },
    });
  }),

  http.post(`${BASE}/admin/affiliates`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { eventId: string; commissionPct: number };
    const code = `aff-${body.eventId}-${Date.now().toString(36)}`;
    return HttpResponse.json({
      data: {
        id: `aff-link-${Date.now()}`,
        code,
        eventId: body.eventId,
        eventTitle: 'Evento',
        commissionPercentage: body.commissionPct,
        clicks: 0,
        conversions: 0,
        totalEarned: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.patch(`${BASE}/admin/affiliates/:id/deactivate`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, status: 'inactive' } });
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

  // ── Admin: Staff ────────────────────────────────────────────────────────

  http.get(`${BASE}/staff`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const staff = [
      { id: 'stf-001', eventId, name: 'Ana Lima', role: 'hostess', phone: '(11) 99001-1001', shiftStart: '17:00', shiftEnd: '23:00', checkedIn: true,  checkInsPerformed: 142 },
      { id: 'stf-002', eventId, name: 'Carlos Mota', role: 'security', phone: '(11) 99002-2002', shiftStart: '16:00', shiftEnd: '00:00', checkedIn: true,  checkInsPerformed: 0 },
      { id: 'stf-003', eventId, name: 'Beatriz Souza', role: 'bar', phone: '(11) 99003-3003', shiftStart: '18:00', shiftEnd: '02:00', checkedIn: false, checkInsPerformed: 0 },
      { id: 'stf-004', eventId, name: 'Diego Costa', role: 'coordinator', phone: '(11) 99004-4004', shiftStart: '15:00', shiftEnd: '23:00', checkedIn: true,  checkInsPerformed: 89 },
      { id: 'stf-005', eventId, name: 'Érica Mendes', role: 'custom', phone: '(11) 99005-5005', shiftStart: '20:00', shiftEnd: '04:00', checkedIn: false, checkInsPerformed: 0 },
    ];
    return HttpResponse.json({ data: staff });
  }),

  http.post(`${BASE}/staff`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `stf-${Date.now()}`, ...body, checkedIn: false, checkInsPerformed: 0 },
    }, { status: 201 });
  }),

  http.delete(`${BASE}/staff/:id`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { success: true } });
  }),

  // ── Admin: Areas ─────────────────────────────────────────────────────────

  http.get(`${BASE}/areas`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const areas = [
      { id: 'area-001', eventId, name: 'Pista Principal', capacity: 5000, occupancy: 3800 },
      { id: 'area-002', eventId, name: 'Camarote VIP', capacity: 500, occupancy: 470 },
      { id: 'area-003', eventId, name: 'Área Bar', capacity: 1000, occupancy: 620 },
      { id: 'area-004', eventId, name: 'Backstage', capacity: 200, occupancy: 45 },
    ];
    return HttpResponse.json({ data: areas });
  }),

  http.post(`${BASE}/areas`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `area-${Date.now()}`, ...body, occupancy: 0 },
    }, { status: 201 });
  }),

  http.put(`${BASE}/areas/:id`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ data: body });
  }),

  http.delete(`${BASE}/areas/:id`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { success: true } });
  }),

  // ── Admin: Courtesies ────────────────────────────────────────────────────

  http.get(`${BASE}/courtesies`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const courtesies = [
      { id: 'crt-001', eventId, guestName: 'Marcos Vinicius', email: 'marcos@agency.com', batchType: 'vip',       notes: 'Parceiro comercial', status: 'approved', createdAt: '2025-04-01T10:00:00Z' },
      { id: 'crt-002', eventId, guestName: 'Fernanda Rocha',  email: 'fernanda@press.com', batchType: 'press',     notes: 'Jornalista convidada', status: 'pending',  createdAt: '2025-04-02T11:00:00Z' },
      { id: 'crt-003', eventId, guestName: 'DJ Alok',         email: 'alok@team.com',      batchType: 'artista',   notes: 'Headliner',           status: 'used',     createdAt: '2025-03-28T08:00:00Z' },
      { id: 'crt-004', eventId, guestName: 'Patrocinador XYZ', email: 'vip@xyz.com',       batchType: 'camarote',  notes: 'Cota patrocínio',     status: 'approved', createdAt: '2025-04-05T14:00:00Z' },
      { id: 'crt-005', eventId, guestName: 'Lucas Backstage', email: 'lucas@crew.com',     batchType: 'backstage', notes: 'Equipe de produção',  status: 'pending',  createdAt: '2025-04-06T09:00:00Z' },
    ];
    return HttpResponse.json({ data: courtesies });
  }),

  http.post(`${BASE}/courtesies`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `crt-${Date.now()}`, ...body, status: 'pending', createdAt: new Date().toISOString() },
    }, { status: 201 });
  }),

  http.patch(`${BASE}/courtesies/:id/approve`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, status: 'approved' } });
  }),

  http.delete(`${BASE}/courtesies/:id`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { success: true } });
  }),

  // ── Admin: Waitlist ──────────────────────────────────────────────────────

  http.get(`${BASE}/waitlist`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    const entries = [
      { id: 'wl-001', eventId, position: 1, name: 'João Espera',   email: 'joao@email.com',   phone: '(11) 99101-0001', batchPreference: 'Pista',   status: 'notified',  joinedAt: '2025-03-20T08:00:00Z' },
      { id: 'wl-002', eventId, position: 2, name: 'Maria Fila',    email: 'maria@email.com',  phone: '(11) 99102-0002', batchPreference: 'VIP',     status: 'purchased', joinedAt: '2025-03-21T09:00:00Z' },
      { id: 'wl-003', eventId, position: 3, name: 'Carlos Next',   email: 'carlos@email.com', phone: '(11) 99103-0003', batchPreference: 'Pista',   status: 'waiting',   joinedAt: '2025-03-22T10:00:00Z' },
      { id: 'wl-004', eventId, position: 4, name: 'Ana Aguarda',   email: 'ana@email.com',    phone: '(11) 99104-0004', batchPreference: 'Camarote',status: 'waiting',   joinedAt: '2025-03-23T11:00:00Z' },
      { id: 'wl-005', eventId, position: 5, name: 'Pedro Waiting', email: 'pedro@email.com',  phone: '(11) 99105-0005', batchPreference: 'Pista',   status: 'notified',  joinedAt: '2025-03-24T12:00:00Z' },
    ];
    return HttpResponse.json({ data: entries });
  }),

  http.post(`${BASE}/waitlist/notify`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { notified: true, message: 'Notificações enviadas com sucesso' } });
  }),

  // ── Favorites toggle ───────────────────────────────────────────────────

  http.post(`${BASE}/favorites/toggle`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { eventId: string };
    const isFavorited = Math.random() > 0.5;
    return HttpResponse.json({ data: { isFavorited, eventId: body.eventId } });
  }),

  // ── Orders ─────────────────────────────────────────────────────────────

  http.get(`${BASE}/orders/:id`, async ({ params }) => {
    await delay(LAT);
    const orderId = params.id as string;
    const qrBase = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=`;
    return HttpResponse.json({
      data: {
        id: orderId,
        status: 'confirmed',
        createdAt: '2025-01-15T10:22:00Z',
        event: {
          id: 'evt-001',
          title: 'Lollapalooza Brasil 2025',
          startDate: '2025-03-28T12:00:00-03:00',
          coverImage: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80',
          venue: { name: 'Autódromo de Interlagos', city: 'São Paulo', state: 'SP' },
        },
        tickets: [
          { id: 'tkt-001', holderName: 'Usuário Demo', batchName: '1º Lote — Pista', batchType: 'normal', price: 39500, qrCodeUrl: `${qrBase}tkt-001-${orderId}` },
          { id: 'tkt-002', holderName: 'Usuário Demo', batchName: '1º Lote — Pista', batchType: 'normal', price: 39500, qrCodeUrl: `${qrBase}tkt-002-${orderId}` },
        ],
        payment: {
          method: 'pix',
          amountCents: 79000,
          pixCode: '00020126580014BR.GOV.BCB.PIX013636c8e359-0eda-4bce-9740-11e9c1a76e625204000053039865406790.005802BR5925TICKETY PAGAMENTOS LTDA6009SAO PAULO6304ABCD',
          paidAt: '2025-01-15T10:25:00Z',
        },
      },
    });
  }),

  http.post(`${BASE}/orders/:id/cancel`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, status: 'cancelled' } });
  }),

  // ── Promoter Me Dashboard ────────────────────────────────────────────────

  http.get(`${BASE}/promoters/me/dashboard`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const guests = Array.from({ length: 14 }, (_, i) => ({
      id: `guest-${i + 1}`,
      name: ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima', 'Fernanda Melo', 'Ricardo Alves', 'Juliana Nunes', 'Bruno Carvalho', 'Camila Rocha', 'Lucas Mendes', 'Marina Silva', 'Felipe Gomes', 'Larissa Costa'][i],
      email: `convidado${i + 1}@email.com`,
      status: i < 9 ? 'checked_in' : 'pending',
      checkedInAt: i < 9 ? new Date(Date.now() - i * 900000).toISOString() : null,
    }));
    return HttpResponse.json({
      data: {
        promoter: {
          id: 'prm-me',
          name: 'Usuário Demo',
          slug: 'demo-promoter',
          tier: 'silver',
          shareLink: 'http://localhost:5173/guest/demo-promoter',
        },
        events: [
          { id: 'evt-001', title: 'Lollapalooza Brasil 2025', startDate: '2025-03-28T12:00:00-03:00' },
          { id: 'evt-012', title: 'Ultra Music Festival Brasil', startDate: '2025-05-10T15:00:00-03:00' },
        ],
        selectedEvent: eventId ?? 'evt-001',
        kpis: {
          totalGuests: guests.length,
          checkIns: 9,
          conversionPct: 64.3,
          rank: 3,
          totalPromoters: 12,
        },
        guests,
      },
    });
  }),

  // ── Guest Lists: Public registration ────────────────────────────────────

  http.get(`${BASE}/guest-lists/public/:slug`, async ({ params }) => {
    await delay(LAT);
    const slug = params.slug as string;
    return HttpResponse.json({
      data: {
        id: `gl-pub-${slug}`,
        title: 'Lollapalooza Brasil 2025',
        startDate: '2025-03-28T12:00:00-03:00',
        coverImage: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
        venue: { name: 'Autódromo de Interlagos', city: 'São Paulo', state: 'SP' },
        promoter: { name: 'Diego Souza' },
      },
    });
  }),

  http.post(`${BASE}/guest-lists/register`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { name: string; slug: string };
    const guestId = `guest-${Date.now()}`;
    const qrData = encodeURIComponent(`${guestId}:${body.slug}`);
    return HttpResponse.json({
      data: {
        guestId,
        name: body.name,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`,
        message: 'Cadastro realizado com sucesso!',
      },
    }, { status: 201 });
  }),

  // ── Admin: Box Office ────────────────────────────────────────────────────

  http.get(`${BASE}/admin/box-office/batches`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    return HttpResponse.json({
      data: [
        { id: `${eventId}-batch-1`, name: '1º Lote — Pista', type: 'normal', price: 39500, available: 180 },
        { id: `${eventId}-batch-2`, name: 'VIP', type: 'vip', price: 98750, available: 25 },
        { id: `${eventId}-batch-3`, name: 'Camarote Premium', type: 'camarote', price: 158000, available: 0 },
      ],
    });
  }),

  http.post(`${BASE}/admin/box-office/sessions`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { eventId: string };
    return HttpResponse.json({
      data: {
        id: `session-${Date.now()}`,
        eventId: body.eventId,
        active: true,
        startedAt: new Date().toISOString(),
        ticketsSold: 0,
        revenueCents: 0,
      },
    }, { status: 201 });
  }),

  http.post(`${BASE}/admin/box-office/sessions/:id/end`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: { ended: true, endedAt: new Date().toISOString() } });
  }),

  http.get(`${BASE}/admin/box-office/sessions/:id/sales`, async () => {
    await delay(LAT);
    return HttpResponse.json({ data: [] });
  }),

  http.post(`${BASE}/admin/box-office/sessions/:id/sell`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as { guestName: string; batchId: string };
    return HttpResponse.json({
      data: {
        id: `sale-${Date.now()}`,
        guestName: body.guestName,
        batchName: '1º Lote — Pista',
        amountCents: 39500,
        soldAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  // ── Admin: Price Rules ────────────────────────────────────────────────────

  http.get(`${BASE}/admin/price-rules`, async ({ request }) => {
    await delay(LAT);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') ?? 'evt-001';
    return HttpResponse.json({
      data: [
        {
          id: 'rule-001', eventId,
          batchId: `${eventId}-batch-1`, batchName: '1º Lote — Pista',
          conditionType: 'sold_pct', conditionValue: 80,
          actionType: 'increase_pct', actionValue: 15,
          active: true, createdAt: '2025-03-01T10:00:00Z',
        },
        {
          id: 'rule-002', eventId,
          batchId: `${eventId}-batch-2`, batchName: 'VIP',
          conditionType: 'time_before', conditionValue: 48,
          actionType: 'increase_pct', actionValue: 20,
          active: false, createdAt: '2025-03-02T10:00:00Z',
        },
      ],
    });
  }),

  http.post(`${BASE}/admin/price-rules`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: `rule-${Date.now()}`, ...body, active: true, createdAt: new Date().toISOString() },
    }, { status: 201 });
  }),

  http.post(`${BASE}/admin/price-rules/:id/toggle`, async ({ params, request }) => {
    await delay(LAT);
    const body = (await request.json()) as { active: boolean };
    return HttpResponse.json({ data: { id: params.id, active: body.active } });
  }),

  http.post(`${BASE}/admin/price-rules/:id/delete`, async ({ params }) => {
    await delay(100);
    return HttpResponse.json({ data: { id: params.id, deleted: true } });
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

  // ── Admin: Affiliates ────────────────────────────────────────────────────

  http.get(`${BASE}/admin/affiliates`, async () => {
    await delay(LAT);
    const links = [
      {
        id: 'afl-001',
        code: 'aff-tech-2025-001',
        eventId: 'evt-001',
        eventTitle: 'Lollapalooza Brasil 2025',
        commissionPercentage: 10,
        clicks: 312,
        conversions: 24,
        totalEarned: 1184.40,
        status: 'active',
        createdAt: '2025-03-15T10:00:00Z',
      },
      {
        id: 'afl-002',
        code: 'aff-ultra-2025-01',
        eventId: 'evt-012',
        eventTitle: 'Ultra Music Festival Brasil',
        commissionPercentage: 8,
        clicks: 540,
        conversions: 47,
        totalEarned: 1892.50,
        status: 'active',
        createdAt: '2025-02-20T10:00:00Z',
      },
      {
        id: 'afl-003',
        code: 'aff-rock-2025-02',
        eventId: 'evt-003',
        eventTitle: 'Rock in Rio 2025',
        commissionPercentage: 12,
        clicks: 98,
        conversions: 6,
        totalEarned: 288.00,
        status: 'inactive',
        createdAt: '2025-01-10T10:00:00Z',
      },
      {
        id: 'afl-004',
        code: 'aff-coldplay-2025',
        eventId: 'evt-005',
        eventTitle: 'Coldplay Tour 2025',
        commissionPercentage: 9,
        clicks: 215,
        conversions: 18,
        totalEarned: 950.40,
        status: 'active',
        createdAt: '2025-04-01T10:00:00Z',
      },
    ];

    const topAffiliates = [
      { id: 'aff-1', name: 'João Silva',     email: 'joao.silva@parceiro.com',    totalSales: 5200.00,  totalCommission: 520.00,  conversionRate: 7.8, rank: 1 },
      { id: 'aff-2', name: 'Maria Santos',   email: 'maria.santos@parceiro.com',  totalSales: 3800.00,  totalCommission: 380.00,  conversionRate: 6.5, rank: 2 },
      { id: 'aff-3', name: 'Pedro Oliveira', email: 'pedro@parceiro.com',         totalSales: 2900.00,  totalCommission: 232.00,  conversionRate: 5.2, rank: 3 },
      { id: 'aff-4', name: 'Ana Costa',      email: 'ana.costa@parceiro.com',     totalSales: 1800.00,  totalCommission: 162.00,  conversionRate: 4.1, rank: 4 },
      { id: 'aff-5', name: 'Carlos Martins', email: 'carlos.martins@parceiro.com',totalSales: 1200.00,  totalCommission: 96.00,   conversionRate: 3.8, rank: 5 },
    ];

    const commissionHistory = [
      { id: 'comm-1', date: '2025-04-10', affiliateName: 'João Silva',     affiliateEmail: 'joao.silva@parceiro.com',    eventTitle: 'Lollapalooza Brasil 2025', saleAmount: 395.00, commissionPercentage: 10, commissionValue: 39.50, status: 'paid' },
      { id: 'comm-2', date: '2025-04-09', affiliateName: 'Maria Santos',   affiliateEmail: 'maria.santos@parceiro.com',  eventTitle: 'Ultra Music Festival',     saleAmount: 250.00, commissionPercentage: 8,  commissionValue: 20.00, status: 'paid' },
      { id: 'comm-3', date: '2025-04-08', affiliateName: 'Pedro Oliveira', affiliateEmail: 'pedro@parceiro.com',         eventTitle: 'Lollapalooza Brasil 2025', saleAmount: 580.00, commissionPercentage: 10, commissionValue: 58.00, status: 'pending' },
      { id: 'comm-4', date: '2025-04-07', affiliateName: 'Ana Costa',      affiliateEmail: 'ana.costa@parceiro.com',     eventTitle: 'Coldplay Tour 2025',       saleAmount: 310.00, commissionPercentage: 9,  commissionValue: 27.90, status: 'pending' },
      { id: 'comm-5', date: '2025-04-06', affiliateName: 'Carlos Martins', affiliateEmail: 'carlos.martins@parceiro.com',eventTitle: 'Rock in Rio 2025',         saleAmount: 240.00, commissionPercentage: 12, commissionValue: 28.80, status: 'paid' },
    ];

    const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
    const totalConversions = links.reduce((s, l) => s + l.conversions, 0);
    const totalCommissionsCents = Math.round(commissionHistory.reduce((s, c) => s + c.commissionValue, 0) * 100);

    return HttpResponse.json({
      data: {
        links,
        topAffiliates,
        commissionHistory,
        stats: {
          totalAffiliates: topAffiliates.length,
          totalClicks,
          totalConversions,
          totalCommissionsCents,
        },
      },
    });
  }),

  http.post(`${BASE}/admin/affiliates`, async ({ request }) => {
    await delay(LAT);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: {
        id: `afl-${Date.now()}`,
        ...body,
        code: `aff-${Date.now()}`,
        clicks: 0,
        conversions: 0,
        totalEarned: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.patch(`${BASE}/admin/affiliates/:id/deactivate`, async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json({ data: { id: params.id, status: 'inactive' } });
  }),
];
