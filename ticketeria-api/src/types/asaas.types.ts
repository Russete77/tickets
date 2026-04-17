/**
 * Asaas API Response Types
 * These types represent the structure of responses from the Asaas payment API
 */

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'DEBIT_ACCOUNT';
  status:
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED'
    | 'CANCELED'
    | 'CHARGEBACK_REQUESTED'
    | 'CHARGEBACK_DISPUTE'
    | 'AWAITING_RISK_ANALYSIS';
  value: number;
  paidValue?: number;
  dueDate: string;
  receivedDate?: string;
  invoiceNumber?: string;
  description?: string;
  externalReference?: string;
  invoiceUrl?: string;
  originalValue?: number;
  split?: AsaasSplitConfig[];
  creditCard?: {
    brand?: string;
    last4?: string;
    holderName?: string;
  };
}

export interface AsaasSplitConfig {
  walletId: string;
  percentualValue: number;
  fixedValue?: number;
}

export interface AsaasPixQrCode {
  id: string;
  paymentId: string;
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface AsaasAccount {
  id: string;
  name: string;
  email: string;
  loginEmail?: string;
  cpfCnpj?: string;
  city?: string;
  state?: string;
  businessType?: string;
  wallets?: AsaasWallet[];
}

export interface AsaasWallet {
  id: string;
  name: string;
  balance: number;
}

export interface AsaasBalance {
  balance: number;
  totalBalance?: number;
  availableBalance?: number;
  pendingBalance?: number;
}

export interface AsaasTransfer {
  id: string;
  status: 'PENDING' | 'BANK_PROCESSING' | 'DONE' | 'FAILED';
  accountId: string;
  value: number;
  scheduleDate: string;
}

export interface AsaasStatement {
  object: string;
  hasMore: boolean;
  totalCount?: number;
  limit: number;
  offset: number;
  data: AsaasTransaction[];
}

export interface AsaasTransaction {
  id: string;
  object: string;
  accountId: string;
  type: string;
  value: number;
  status: string;
  description: string;
  createdDate: string;
}

export interface AsaasWebhookPayload {
  event: string;
  payment?: AsaasPayment;
  transfer?: AsaasTransfer;
  subscription?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  invoiceUrl?: string;
  billingType: string;
}
