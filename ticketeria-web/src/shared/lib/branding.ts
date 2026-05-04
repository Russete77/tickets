/**
 * White-label / branding loader.
 *
 * No boot do app:
 *   1. GET /api/v1/branding/by-domain?host=window.location.hostname
 *   2. Se matched, injeta CSS variables no :root e ajusta favicon/title.
 *   3. Persiste no Zustand para componentes consumirem.
 *
 * Auditoria CTO 2026-05 — gap 4.12
 */
import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333/api';

export interface BrandingPayload {
  matched: boolean;
  organizationId?: string;
  slug?: string;
  name?: string;
  locale?: string;
  currency?: string;
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    metaDescription?: string;
    socialImage?: string;
  } | null;
}

interface BrandingState {
  loaded: boolean;
  data: BrandingPayload | null;
  setData: (data: BrandingPayload | null) => void;
}

export const useBranding = create<BrandingState>((set) => ({
  loaded: false,
  data: null,
  setData: (data) => set({ data, loaded: true }),
}));

function injectCssVars(branding: BrandingPayload['branding']): void {
  if (!branding) return;
  const lines: string[] = [];
  if (branding.primaryColor) lines.push(`--brand-primary: ${branding.primaryColor};`);
  if (branding.accentColor) lines.push(`--brand-accent: ${branding.accentColor};`);
  if (branding.fontFamily) lines.push(`--brand-font: ${branding.fontFamily};`);
  if (lines.length === 0) return;

  // Cria/atualiza style tag dedicada.
  let tag = document.getElementById('pulsepass-branding') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'pulsepass-branding';
    document.head.appendChild(tag);
  }
  tag.innerHTML = `:root { ${lines.join(' ')} }`;
}

function applyDocumentMeta(payload: BrandingPayload): void {
  if (!payload.matched) return;
  const b = payload.branding;
  if (b?.faviconUrl) {
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
  if (payload.name) {
    document.title = payload.name;
  }
  if (b?.metaDescription) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = b.metaDescription;
  }
}

export async function loadBranding(): Promise<void> {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname;
  // Em dev local, ignore.
  if (host === 'localhost' || host === '127.0.0.1') {
    useBranding.getState().setData({ matched: false });
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/v1/branding/by-domain?host=${encodeURIComponent(host)}`,
      { credentials: 'omit' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { success: boolean; data: BrandingPayload };

    if (json.success && json.data.matched) {
      injectCssVars(json.data.branding);
      applyDocumentMeta(json.data);
    }
    useBranding.getState().setData(json.data);
  } catch (err) {
    console.warn('Branding load falhou — usando default', err);
    useBranding.getState().setData({ matched: false });
  }
}

/** Hook React. */
export function useBrandingData() {
  return useBranding((s) => s.data);
}
