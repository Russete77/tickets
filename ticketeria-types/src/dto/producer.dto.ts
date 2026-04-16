import { CompanyType, AsaasAccountStatus, DocumentsStatus } from "../enums";

export interface ProducerPublicInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface ProducerProfile extends ProducerPublicInfo {
  cpf: string;
  phone: string | null;
  bio: string | null;
  createdAt: string;
  totalEvents: number;
  totalTicketsSold: number;
  averageRating: number | null;
}

export interface CompanyInfo {
  name: string;
  cnpj: string;
  type: CompanyType;
  email: string;
  phone: string;
  website?: string;
}

export interface BankingInfo {
  accountHolder: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountType: "checking" | "savings";
  cpfCnpj: string;
}

export interface DocumentUpload {
  type: string;
  url: string;
  uploadedAt: string;
  expiresAt: string | null;
}

export interface FinancialSummary {
  totalEarnings: number;
  totalFees: number;
  netEarnings: number;
  pendingBalance: number;
  availableBalance: number;
  lastPayout: string | null;
  nextPayoutDate: string | null;
}

export interface StatementEntry {
  id: string;
  type: "sale" | "refund" | "fee" | "payout" | "dispute";
  description: string;
  amountCents: number;
  balanceCents: number;
  reference: string;
  createdAt: string;
}

export interface UpdateProducerRequest {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface UpdateProducerResponse {
  producer: ProducerProfile;
  message: string;
}

export interface VerifyProducerRequest {
  companyInfo: CompanyInfo;
  bankingInfo: BankingInfo;
  documents: Array<{
    type: string;
    url: string;
  }>;
}

export interface VerifyProducerResponse {
  success: true;
  verification: {
    status: DocumentsStatus;
    asaasStatus: AsaasAccountStatus;
    submittedAt: string;
  };
  message: string;
}

export interface PayoutResponse {
  success: true;
  payoutId: string;
  amount: number;
  scheduledFor: string;
  message: string;
}

export interface ProducerStats {
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  averageEventSize: number;
  topCategory: string | null;
}
