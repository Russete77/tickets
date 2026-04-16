// ──────────────────────────────────────────────────────────────────────────
// MOCK DATA — campos alinhados com EventData (EventCard.tsx)
// ──────────────────────────────────────────────────────────────────────────

export interface MockEvent {
  // Campos obrigatórios de EventData
  id: string;
  slug: string;
  title: string;
  coverImage: string;          // era imageUrl — renomeado para bater com EventCard
  venue: { name: string; city: string; state: string };
  startDate: string;           // era date — ISO string completo
  currentBatchPrice: number;   // era price.min — em centavos (× 100)
  urgencyMessage?: string;
  sold?: number;
  totalCapacity?: number;
  rating?: number;
  // Campos extras da plataforma
  description: string;
  category: string;
  endDate?: string;
  time: string;
  price: { min: number; max: number; currency: string };  // em reais, para exibição
  isFeatured: boolean;
  tags: string[];
  organizer: { id: string; name: string };
}

const IMAGES = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1547321354-e4f4ed406e61?w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=800&q=80',
];

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'evt-001',
    title: 'Lollapalooza Brasil 2025',
    slug: 'lollapalooza-brasil-2025',
    description: 'O maior festival de música do mundo chega ao Brasil com line-up incrível. Três dias de muito rock, pop e eletrônico no Autódromo de Interlagos.',
    category: 'shows',
    startDate: '2025-03-28T12:00:00-03:00',
    time: '12:00',
    venue: { name: 'Autódromo de Interlagos', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[1],
    currentBatchPrice: 39500,   // R$ 395,00 em centavos
    price: { min: 395, max: 1290, currency: 'BRL' },
    sold: 89000,
    totalCapacity: 131000,
    urgencyMessage: 'Últimos ingressos!',
    rating: 4.9,
    isFeatured: true,
    tags: ['festival', 'rock', 'pop', 'internacional'],
    organizer: { id: 'org-001', name: 'C3 Presents' },
  },
  {
    id: 'evt-002',
    title: 'Coldplay Music of the Spheres Tour',
    slug: 'coldplay-music-of-the-spheres-tour',
    description: 'A turnê mais sustentável da história do rock. Chris Martin e banda prometem um espetáculo visual único com pulseiras LED e fogos biodegradáveis.',
    category: 'shows',
    startDate: '2025-10-07T20:00:00-03:00',
    time: '20:00',
    venue: { name: 'Estádio Nilton Santos', city: 'Rio de Janeiro', state: 'RJ' },
    coverImage: IMAGES[0],
    currentBatchPrice: 29000,
    price: { min: 290, max: 980, currency: 'BRL' },
    sold: 56500,
    totalCapacity: 65000,
    urgencyMessage: '8.500 ingressos restantes',
    rating: 4.8,
    isFeatured: true,
    tags: ['show', 'rock', 'internacional', 'imperdível'],
    organizer: { id: 'org-002', name: 'T4F Entretenimento' },
  },
  {
    id: 'evt-003',
    title: 'Rock in Rio 2025',
    slug: 'rock-in-rio-2025',
    description: 'A Cidade do Rock volta a pulsar! Sete dias de shows épicos com os maiores nomes do rock, pop e sertanejo em palcos simultâneos.',
    category: 'shows',
    startDate: '2025-09-19T14:00:00-03:00',
    time: '14:00',
    venue: { name: 'Parque Olímpico', city: 'Rio de Janeiro', state: 'RJ' },
    coverImage: IMAGES[2],
    currentBatchPrice: 45000,
    price: { min: 450, max: 1500, currency: 'BRL' },
    sold: 96800,
    totalCapacity: 100000,
    urgencyMessage: 'Quase esgotado!',
    rating: 4.9,
    isFeatured: true,
    tags: ['festival', 'rock', 'pop', 'sertanejo'],
    organizer: { id: 'org-003', name: 'Rock in Rio' },
  },
  {
    id: 'evt-004',
    title: 'Wesley Safadão — Tour Camarote Nordeste',
    slug: 'wesley-safadao-tour-camarote-nordeste',
    description: 'O rei do Forró Estilizado em uma noite inesquecível. Camarote exclusivo com open bar premium e visão privilegiada do palco.',
    category: 'forró',
    startDate: '2025-04-19T22:00:00-03:00',
    time: '22:00',
    venue: { name: 'Centro de Convenções', city: 'Fortaleza', state: 'CE' },
    coverImage: IMAGES[9],
    currentBatchPrice: 12000,
    price: { min: 120, max: 380, currency: 'BRL' },
    sold: 3800,
    totalCapacity: 5000,
    rating: 4.5,
    isFeatured: false,
    tags: ['forró', 'sertanejo', 'nordeste', 'camarote'],
    organizer: { id: 'org-004', name: 'WS Produções' },
  },
  {
    id: 'evt-005',
    title: 'Campus Party Brasil 2025',
    slug: 'campus-party-brasil-2025',
    description: 'O maior evento de tecnologia, inovação e criatividade do mundo. Cinco dias imersivos com hackatons, palestras e networking.',
    category: 'tecnologia',
    startDate: '2025-07-15T08:00:00-03:00',
    time: '08:00',
    venue: { name: 'Expo Center Norte', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[7],
    currentBatchPrice: 8900,
    price: { min: 89, max: 350, currency: 'BRL' },
    sold: 18000,
    totalCapacity: 30000,
    rating: 4.3,
    isFeatured: false,
    tags: ['tech', 'inovação', 'startup', 'hackathon'],
    organizer: { id: 'org-005', name: 'Campus Party' },
  },
  {
    id: 'evt-006',
    title: 'Festa Junina de Caruaru 2025',
    slug: 'festa-junina-caruaru-2025',
    description: 'A maior festa junina do mundo, reconhecida pela UNESCO. Quadrilhas, forró, comidas típicas e muita animação.',
    category: 'festas',
    startDate: '2025-06-13T18:00:00-03:00',
    time: '18:00',
    venue: { name: 'Pátio Luiz Gonzaga', city: 'Caruaru', state: 'PE' },
    coverImage: IMAGES[3],
    currentBatchPrice: 0,
    price: { min: 0, max: 150, currency: 'BRL' },
    sold: 75000,
    totalCapacity: 150000,
    rating: 4.7,
    isFeatured: false,
    tags: ['festa junina', 'forró', 'cultura', 'nordeste'],
    organizer: { id: 'org-006', name: 'Prefeitura de Caruaru' },
  },
  {
    id: 'evt-007',
    title: 'Maroon 5 Live in Brasil',
    slug: 'maroon-5-live-brasil-2025',
    description: 'Adam Levine e Maroon 5 de volta ao Brasil com a turnê que percorreu o mundo. Uma noite cheia de hits no maior estádio da América do Sul.',
    category: 'shows',
    startDate: '2025-05-03T21:00:00-03:00',
    time: '21:00',
    venue: { name: 'Allianz Parque', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[4],
    currentBatchPrice: 34000,
    price: { min: 340, max: 890, currency: 'BRL' },
    sold: 39200,
    totalCapacity: 46000,
    urgencyMessage: '6.800 ingressos restantes',
    rating: 4.6,
    isFeatured: true,
    tags: ['pop', 'rock', 'internacional', 'arena'],
    organizer: { id: 'org-002', name: 'T4F Entretenimento' },
  },
  {
    id: 'evt-008',
    title: 'São Paulo Fashion Week N58',
    slug: 'spfw-n58-2025',
    description: 'A maior semana de moda da América Latina celebra suas marcas autorais e novos talentos em desfiles exclusivos.',
    category: 'moda',
    startDate: '2025-04-25T10:00:00-03:00',
    time: '10:00',
    venue: { name: 'Instituto Tomie Ohtake', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[11],
    currentBatchPrice: 20000,
    price: { min: 200, max: 1200, currency: 'BRL' },
    sold: 2200,
    totalCapacity: 3000,
    rating: 4.4,
    isFeatured: false,
    tags: ['moda', 'fashion', 'arte', 'design'],
    organizer: { id: 'org-007', name: 'SPFW' },
  },
  {
    id: 'evt-009',
    title: 'Festival Gastronômico de Tiradentes',
    slug: 'festival-gastronomico-tiradentes-2025',
    description: 'A 24ª edição do maior festival gastronômico do Brasil reúne chefs renomados e produtores locais em menus especiais.',
    category: 'gastronomia',
    startDate: '2025-07-24T11:00:00-03:00',
    time: '11:00',
    venue: { name: 'Centro Histórico', city: 'Tiradentes', state: 'MG' },
    coverImage: IMAGES[10],
    currentBatchPrice: 5000,
    price: { min: 50, max: 280, currency: 'BRL' },
    sold: 4500,
    totalCapacity: 8000,
    rating: 4.8,
    isFeatured: false,
    tags: ['gastronomia', 'cultura', 'chefs', 'turismo'],
    organizer: { id: 'org-008', name: 'Instituto Gastronômico' },
  },
  {
    id: 'evt-010',
    title: "Racionais MC's — 35 Anos de Sobrevivência",
    slug: 'racionais-35-anos-sobrevivencia',
    description: 'Em comemoração aos 35 anos de carreira, Mano Brown, Ice Blue, Edi Rock e KL Jay revisitam os álbuns clássicos em show histórico.',
    category: 'shows',
    startDate: '2025-08-16T20:00:00-03:00',
    time: '20:00',
    venue: { name: 'Espaço Unimed', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[0],
    currentBatchPrice: 18000,
    price: { min: 180, max: 450, currency: 'BRL' },
    sold: 9800,
    totalCapacity: 14000,
    rating: 4.9,
    isFeatured: false,
    tags: ['rap', 'hip-hop', 'nacional', 'clássico'],
    organizer: { id: 'org-009', name: 'Racionais Produções' },
  },
  {
    id: 'evt-011',
    title: 'Carnaval de Olinda 2026',
    slug: 'carnaval-olinda-2026',
    description: 'O maior carnaval de rua do mundo. Bonecos gigantes, frevo e maracatu nas ladeiras e ruas estreitas da cidade histórica.',
    category: 'festas',
    startDate: '2026-02-14T07:00:00-03:00',
    time: '07:00',
    venue: { name: 'Centro Histórico de Olinda', city: 'Olinda', state: 'PE' },
    coverImage: IMAGES[3],
    currentBatchPrice: 0,
    price: { min: 0, max: 200, currency: 'BRL' },
    sold: 120000,
    totalCapacity: 220000,
    rating: 5.0,
    isFeatured: true,
    tags: ['carnaval', 'cultura', 'frevo', 'patrimônio'],
    organizer: { id: 'org-010', name: 'Prefeitura de Olinda' },
  },
  {
    id: 'evt-012',
    title: 'Ultra Music Festival Brasil',
    slug: 'ultra-music-festival-brasil-2025',
    description: 'O festival de música eletrônica mais icônico do mundo desembarca no Brasil. DJs de renome mundial e produção de tirar o fôlego.',
    category: 'eletrônica',
    startDate: '2025-05-10T15:00:00-03:00',
    time: '15:00',
    venue: { name: 'Sambódromo do Anhembi', city: 'São Paulo', state: 'SP' },
    coverImage: IMAGES[9],
    currentBatchPrice: 38000,
    price: { min: 380, max: 980, currency: 'BRL' },
    sold: 24400,
    totalCapacity: 30000,
    urgencyMessage: '5.600 ingressos restantes',
    rating: 4.7,
    isFeatured: true,
    tags: ['eletrônica', 'festival', 'dj', 'internacional'],
    organizer: { id: 'org-011', name: 'Ultra Brazil' },
  },
];

// ── Derivados por categoria ──────────────────────────────────────────────

export function getEventsByCategory(category: string, limit = 6): MockEvent[] {
  if (category === 'todos') return MOCK_EVENTS.slice(0, limit);
  return MOCK_EVENTS.filter((e) => e.category === category).slice(0, limit);
}

export function getWeekendEvents(): MockEvent[] {
  return MOCK_EVENTS.filter((e) => e.isFeatured || (e.sold ?? 0) > 30000).slice(0, 8);
}

export function getTrendingEvents(): MockEvent[] {
  return [...MOCK_EVENTS]
    .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
    .slice(0, 6);
}

export function getRecommendedEvents(): MockEvent[] {
  return [...MOCK_EVENTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);
}

export function searchEvents(
  query: string,
  category?: string,
  cursor?: string
): { events: MockEvent[]; nextCursor: string | null } {
  const PAGE_SIZE = 12;
  let results = [...MOCK_EVENTS];

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.venue.city.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'todos') {
    results = results.filter((e) => e.category === category);
  }

  const cursorIndex = cursor ? results.findIndex((e) => e.id === cursor) + 1 : 0;
  const page = results.slice(cursorIndex, cursorIndex + PAGE_SIZE);
  const nextCursor =
    cursorIndex + PAGE_SIZE < results.length ? (page[page.length - 1]?.id ?? null) : null;

  return { events: page, nextCursor };
}

export function getEventBySlug(slug: string): MockEvent | undefined {
  return MOCK_EVENTS.find((e) => e.slug === slug);
}

// ── Mock users store (em memória) ───────────────────────────────────────

export interface MockUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: 'usr-001',
    name: 'Admin Ticketeria',
    email: 'admin@ticketeria.com.br',
    cpf: '00000000000',
    phone: '11999999999',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

function generateToken(userId: string): string {
  return btoa(`mock-token-${userId}-${Date.now()}`);
}

export function mockLogin(
  email: string,
  password: string
): { user: MockUser; token: string } | null {
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !password) return null;
  return { user, token: generateToken(user.id) };
}

export function mockRegister(data: {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
}): { user: MockUser; token: string } | { error: string } {
  const existing = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );
  if (existing) return { error: 'Este e-mail já está cadastrado' };

  const newUser: MockUser = {
    id: `usr-${Date.now()}`,
    name: data.name,
    email: data.email,
    cpf: data.cpf,
    phone: data.phone,
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  MOCK_USERS.push(newUser);
  return { user: newUser, token: generateToken(newUser.id) };
}
