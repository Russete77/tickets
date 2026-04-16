/**
 * Core type definitions for Ticketeria Mobile app.
 * These types should align with the ticketeria-types package.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  coverImage: string;
  category: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  date: string; // ISO 8601
  startTime: string;
  endTime?: string;
  price: number;
  rating: number;
  reviewCount: number;
  status: 'draft' | 'published' | 'ongoing' | 'finished' | 'cancelled';
  totalCapacity: number;
  ticketsSold: number;
  ticketBatches: TicketBatch[];
  lineup?: Array<{
    id: string;
    name: string;
    image?: string;
    role?: string;
  }>;
  timeline?: Array<{
    time: string;
    title: string;
    description?: string;
  }>;
  images?: string[];
  organizer: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventSummary {
  id: string;
  title: string;
  image: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  ticketsRemaining: number;
  totalCapacity: number;
}

export interface TicketBatch {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  ticketType: 'general' | 'vip' | 'presale' | 'subscriber';
  price: number; // In cents (BRL)
  originalPrice?: number; // Before discount
  capacity: number;
  soldCount: number;
  startSaleDate: string; // ISO 8601
  endSaleDate: string; // ISO 8601
  maxPerPerson?: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  batchId: string;
  quantity: number;
  price: number; // Price per unit in cents
  holderName: string;
  holderCPF: string;
  holderEmail?: string;
  holderPhone?: string;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  items: OrderItem[];
  total: number; // In cents
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'credit_card' | 'pix' | 'boleto';
  paymentId?: string;
  discountApplied?: number; // In cents
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // For pending orders
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  batchId: string;
  ticketHash: string;
  qrCode: string;
  code: string;
  holderName: string;
  holderCPF: string;
  holderEmail?: string;
  status: 'active' | 'used' | 'cancelled' | 'transferred' | 'refunded';
  event: {
    title: string;
    venue: { name: string };
    date: string;
  };
  batch: {
    name: string;
  };
  checkins: CheckinRecord[];
  totpSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinRecord {
  id: string;
  ticketId: string;
  userId?: string; // Volunteer/staff checking in the ticket
  timestamp: string; // ISO 8601
  location?: string;
  notes?: string;
}

export interface CheckinResult {
  success: boolean;
  ticketId: string;
  ticketHash: string;
  holderName: string;
  message: string;
  alreadyCheckedIn?: boolean;
  checkinsCount?: number;
}

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  token: string; // Access token (JWT)
  refreshToken: string;
  expiresIn: number; // In seconds
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaymentInfo {
  id: string;
  orderId: string;
  amount: number; // In cents
  currency: string; // BRL
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method: 'credit_card' | 'pix' | 'boleto';
  cardLast4?: string;
  pixQrCode?: string;
  boletoCode?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses?: number;
  usedCount: number;
  applicableBatches: string[]; // Batch IDs
  applicableEvents: string[]; // Event IDs
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  orderUpdates: boolean;
  eventReminders: boolean;
}

export interface UserStats {
  totalEventsAttended: number;
  totalTicketsPurchased: number;
  totalSpent: number; // In cents
  averageRating: number;
  reviewsCount: number;
}

export interface EventStats {
  totalCapacity: number;
  ticketsSold: number;
  ticketsCheckedIn: number;
  occupancyRate: number; // 0-1
  revenue: number; // In cents
  averageRating: number;
  reviewsCount: number;
}

export interface CategoryFilter {
  id: string;
  name: string;
  slug: string;
}

export interface CheckInEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: {
    status: 'valid' | 'already_used' | 'invalid';
    holderName: string;
    eventTitle: string;
    code: string;
  };
}
