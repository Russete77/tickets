export interface Event {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  date: string;
  startsAt: string;
  endsAt: string;
  venue: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    capacity: number;
    city?: string;
    state?: string;
  };
  price: number;
  rating: number;
  category: string;
  tags: string[];
  ageRating: string;
  isOpenBar: boolean;
  gallery: string[];
  lineup: LineupItem[];
  rules?: string;
  dressCode?: string;
  maxTicketsPerCpf: number;
  batches: TicketBatch[];
  producer: ProducerInfo;
  reviews: Review[];
  startTime?: string;
  endTime?: string;
  image?: string;
  reviewCount?: number;
  timeline?: Array<{ time: string; title: string; description?: string }>;
  images?: string[];
  ticketBatches?: TicketBatch[];
}

export interface LineupItem {
  name: string;
  role?: string;
  imageUrl?: string;
  time?: string;
  id?: string;
  image?: string;
}

export interface ProducerInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverImage: string;
  date: string;
  venue: {
    name: string;
    address: string;
  };
  price: number;
  rating: number;
  category: string;
  image?: string;
  originalPrice?: number;
  ticketsRemaining?: number;
  totalCapacity?: number;
  reviewCount?: number;
  city?: string;
}

export interface CategoryFilter {
  id: string;
  name: string;
  slug: string;
}

export interface TicketBatch {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  available: number;
  isVisible: boolean;
}

export interface CheckinRecord {
  id: string;
  ticketId: string;
  timestamp: string;
  location?: string;
}

export interface Ticket {
  id: string;
  code: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  batchType: string;
  status: string;
  cpf: string;
  name: string;
  email: string;
  phone: string | null;
  checkedInAt: string | null;
  qrData?: string;
  createdAt: string;
  holderName?: string;
  qrCode?: string;
  batch?: { name: string };
  event?: { title: string; venue: { name: string }; date: string };
  checkins?: CheckinRecord[];
  ticketHash?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  totpEnabled: boolean;
  createdAt: string;
  avatar?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  token?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  tokens?: AuthTokens;
}

export interface Order {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  status: string;
  totalCents: number;
  paymentMethod: string | null;
  ticketCount: number;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  title?: string;
}

export interface CheckInEvent {
  id: string;
  title: string;
  startsAt: string;
  totalTickets: number;
  checkedIn: number;
  date?: string;
  venue?: string;
}

export interface CheckInResult {
  result: 'valid' | 'invalid_hash' | 'invalid_totp' | 'already_used' | 'wrong_event' | 'ticket_cancelled';
  ticket: {
    id: string;
    code: string;
    status: string;
    name: string;
    email: string;
    cpf: string;
    holderName?: string;
    eventTitle?: string;
  } | null;
  message: string;
  checkedInAt?: string;
  success?: boolean;
}
