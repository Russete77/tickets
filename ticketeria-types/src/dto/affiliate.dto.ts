export interface AffiliateLinkInfo {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  link: string;
  commission: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface AffiliateStats {
  affiliateLinkId: string;
  eventId: string;
  eventTitle: string;
  code: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  earnings: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface CreateAffiliateRequest {
  eventId: string;
  commission: number;
}

export interface CreateAffiliateResponse {
  link: AffiliateLinkInfo;
  message: string;
}

export interface AffiliateListResponse {
  id: string;
  code: string;
  eventTitle: string;
  clicks: number;
  conversions: number;
  earnings: number;
  status: "active" | "inactive";
}

export interface AffiliatePerformance {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  topLink: AffiliateLinkInfo | null;
  performance: AffiliateStats[];
}

export interface PauseAffiliateResponse {
  success: true;
  message: string;
}

export interface ResumeAffiliateResponse {
  success: true;
  message: string;
}

export interface DeleteAffiliateResponse {
  success: true;
  message: string;
}
