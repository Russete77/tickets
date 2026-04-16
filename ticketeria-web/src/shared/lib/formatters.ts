import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (cents: number): string => {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
};

function safeDate(isoDate: string | Date): Date {
  const d = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (isNaN(d.getTime())) throw new RangeError(`Data inválida: "${isoDate}"`);
  return d;
}

export const formatDate = (isoDate: string | Date): string => {
  try {
    return format(safeDate(isoDate), "d 'de' MMMM, yyyy", { locale: ptBR });
  } catch {
    return String(isoDate);
  }
};

export const formatDateTime = (isoDate: string | Date): string => {
  try {
    return format(safeDate(isoDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return String(isoDate);
  }
};

export const formatRelativeTime = (isoDate: string | Date): string => {
  try {
    return formatDistanceToNow(safeDate(isoDate), { addSuffix: true, locale: ptBR });
  } catch {
    return String(isoDate);
  }
};

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const truncate = (text: string, maxLength: number, suffix = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

export const toTitleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatTime = (isoDate: string | Date): string => {
  const date = new Date(isoDate);
  return format(date, 'HH:mm', { locale: ptBR });
};

export const formatShortDate = (isoDate: string | Date): string => {
  const date = new Date(isoDate);
  return format(date, 'dd/MM', { locale: ptBR });
};

export const formatDuration = (startIso: string | Date, endIso: string | Date): string => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}min`;
};
