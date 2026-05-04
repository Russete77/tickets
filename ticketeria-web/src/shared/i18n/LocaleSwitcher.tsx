/**
 * Seletor de idioma. Pluga no header ou no footer.
 * Auditoria CTO 2026-05 — gap 4.11
 */
import React from 'react';
import { useI18n, type Locale } from './index';

const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: 'pt-BR', label: 'Português', flag: 'BR' },
  { code: 'en-US', label: 'English', flag: 'US' },
  { code: 'es-AR', label: 'Español', flag: 'AR' },
];

export const LocaleSwitcher: React.FC = () => {
  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);

  return (
    <select
      aria-label="Idioma"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        border: '1px solid var(--border, #ddd)',
        background: 'transparent',
        fontSize: 14,
      }}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
};
