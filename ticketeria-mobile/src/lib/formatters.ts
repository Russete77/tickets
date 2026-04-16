/**
 * Formats a numeric value (in cents) to Brazilian Real currency format.
 *
 * @param cents - Amount in cents (e.g., 15000 for R$ 150,00)
 * @returns Formatted currency string (e.g., "R$ 150,00")
 */
export function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Formats an ISO date string to Brazilian short date format.
 *
 * @param iso - ISO 8601 date string (e.g., "2026-03-15T20:00:00Z")
 * @returns Formatted date string (e.g., "15 de mar. de 2026")
 */
export function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    console.warn('Invalid date format:', iso);
    return iso;
  }
}

/**
 * Formats an ISO date string to Brazilian full date format with day of week.
 *
 * @param iso - ISO 8601 date string (e.g., "2026-03-15T20:00:00Z")
 * @returns Formatted date string (e.g., "Sábado, 15 de março de 2026")
 */
export function formatDateFull(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    console.warn('Invalid date format:', iso);
    return iso;
  }
}

/**
 * Formats an ISO date/time string to Brazilian time format.
 *
 * @param iso - ISO 8601 date string (e.g., "2026-03-15T20:00:00Z")
 * @returns Formatted time string (e.g., "20:00")
 */
export function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch (error) {
    console.warn('Invalid date format:', iso);
    return iso;
  }
}

/**
 * Formats a CPF string to Brazilian CPF format.
 *
 * @param cpf - CPF string without formatting (e.g., "12345678900")
 * @returns Formatted CPF string (e.g., "123.456.789-00")
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) {
    console.warn('Invalid CPF length:', cleaned.length);
    return cpf;
  }

  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Truncates a string to a maximum length, appending ellipsis if needed.
 *
 * @param str - String to truncate
 * @param maxLen - Maximum length (including ellipsis)
 * @returns Truncated string
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }

  const truncationLength = Math.max(0, maxLen - 3);
  return `${str.substring(0, truncationLength)}...`;
}

/**
 * Formats a date and time string to a combined Brazilian format.
 *
 * @param iso - ISO 8601 date string
 * @returns Formatted string (e.g., "15 de mar. de 2026 às 20:00")
 */
export function formatDateTime(iso: string): string {
  try {
    const date = formatDate(iso);
    const time = formatTime(iso);
    return `${date} às ${time}`;
  } catch (error) {
    console.warn('Invalid date format:', iso);
    return iso;
  }
}

/**
 * Formats a phone number to Brazilian format.
 *
 * @param phone - Phone string without formatting
 * @returns Formatted phone (e.g., "(11) 98765-4321" or "(11) 3567-8901")
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Mobile: (XX) 9XXXX-XXXX
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  console.warn('Invalid phone length:', cleaned.length);
  return phone;
}

/**
 * Formats a numeric value to abbreviated format (K, M, B).
 *
 * @param num - Number to format
 * @returns Abbreviated number (e.g., "1.5K", "2.3M")
 */
export function formatAbbreviated(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  }

  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }

  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }

  return num.toString();
}

/**
 * Formats a percentage value.
 *
 * @param value - Decimal value (0-1)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage (e.g., "75%")
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}
