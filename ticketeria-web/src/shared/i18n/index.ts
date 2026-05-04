/**
 * i18n core para o web (sem react-i18next por simplicidade — bundle leve).
 *
 * - Detecta locale: localStorage > navigator > 'pt-BR'
 * - Suporta interpolação simples {{var}}
 * - Suporta plural via ICU-like ({count, plural, one {...} other {...}})
 *
 * Auditoria CTO 2026-05 — gap 4.11
 */
import { create } from 'zustand';
import ptBR from './messages/pt-BR.json';
import enUS from './messages/en-US.json';
import esAR from './messages/es-AR.json';

export type Locale = 'pt-BR' | 'en-US' | 'es-AR';

const messages: Record<Locale, Record<string, string>> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-AR': esAR,
};

const SUPPORTED: Locale[] = ['pt-BR', 'en-US', 'es-AR'];
const STORAGE_KEY = 'pulsepass:locale';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    /* SSR */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'pt-BR';
  if (nav.startsWith('pt')) return 'pt-BR';
  if (nav.startsWith('es')) return 'es-AR';
  if (nav.startsWith('en')) return 'en-US';
  return 'pt-BR';
}

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useI18n = create<I18nState>((set) => ({
  locale: detectLocale(),
  setLocale: (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* SSR */
    }
    set({ locale: l });
  },
}));

const ICU_PLURAL_RE = /\{(\w+),\s*plural,\s*([^}]+)\}/;

function applyPlural(template: string, vars: Record<string, unknown>): string {
  const m = template.match(ICU_PLURAL_RE);
  if (!m) return template;
  const [whole, varName, branches] = m;
  const value = Number(vars[varName] ?? 0);
  const branchMap: Record<string, string> = {};
  branches.replace(/(zero|one|two|few|many|other)\s*\{([^}]*)\}/g, (_full, key, body) => {
    branchMap[key] = body;
    return '';
  });
  const chosen =
    value === 0 && branchMap.zero
      ? branchMap.zero
      : value === 1 && branchMap.one
        ? branchMap.one
        : (branchMap.other ?? '');
  return template.replace(whole, chosen);
}

export function t(
  key: string,
  vars: Record<string, unknown> = {},
  locale?: Locale,
): string {
  const l = locale ?? useI18n.getState().locale;
  let template = messages[l]?.[key] ?? messages['pt-BR'][key] ?? key;
  template = applyPlural(template, vars);
  for (const [k, v] of Object.entries(vars)) {
    template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return template;
}

/** Hook React para reatividade. */
export function useTranslation() {
  const locale = useI18n((s) => s.locale);
  return {
    locale,
    t: (key: string, vars: Record<string, unknown> = {}) => t(key, vars, locale),
  };
}

// =====================================================
// Currency formatter — multi-currency awareness
// =====================================================

export function formatCurrency(
  cents: number | bigint,
  currency: string = 'BRL',
  locale?: Locale,
): string {
  const l = locale ?? useI18n.getState().locale;
  const value = Number(cents) / 100;
  try {
    return new Intl.NumberFormat(l, {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(date: Date | string, locale?: Locale): string {
  const l = locale ?? useI18n.getState().locale;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(l, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
