/**
 * Branding / white-label loader — Mobile (Expo).
 *
 * O mobile carrega branding após o login (não por domínio como no web,
 * porque o app sabe qual organização o usuário escolheu).
 *
 * Uso:
 *   await loadBrandingForOrganization(orgId);
 *   const { primaryColor } = useBranding();
 *
 * Auditoria CTO 2026-05 — gap 4.12
 */
import { create } from 'zustand';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:3333/api';

export interface BrandingData {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface BrandingPayload {
  matched: boolean;
  organizationId?: string;
  slug?: string;
  name?: string;
  locale?: string;
  currency?: string;
  branding?: BrandingData | null;
}

interface BrandingState {
  data: BrandingPayload | null;
  setData: (data: BrandingPayload | null) => void;
  clear: () => void;
}

export const useBranding = create<BrandingState>((set) => ({
  data: null,
  setData: (data) => set({ data }),
  clear: () => set({ data: null }),
}));

export async function loadBrandingForOrganization(organizationId: string): Promise<void> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/v1/organizations/${organizationId}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return;
    const json = (await res.json()) as { success: boolean; data: { branding?: BrandingData; defaultLocale?: string; defaultCurrency?: string; name?: string; slug?: string } };
    if (!json.success) return;
    useBranding.getState().setData({
      matched: true,
      organizationId,
      name: json.data.name,
      slug: json.data.slug,
      locale: json.data.defaultLocale,
      currency: json.data.defaultCurrency,
      branding: json.data.branding ?? null,
    });
  } catch (err) {
    console.warn('Branding load failed', err);
  }
}

/**
 * Hook React Native para consumir branding com fallback default.
 */
export function useBrandingTheme() {
  const data = useBranding((s) => s.data);
  return {
    primaryColor: data?.branding?.primaryColor ?? '#000000',
    accentColor: data?.branding?.accentColor ?? '#FF3366',
    fontFamily: data?.branding?.fontFamily,
    logoUrl: data?.branding?.logoUrl,
    organizationName: data?.name,
    locale: data?.locale ?? 'pt-BR',
    currency: data?.currency ?? 'BRL',
  };
}
