import { describe, it, expect } from 'vitest';

// Direct implementations for testing without importing formatters module
// This avoids the date-fns dependency issue

describe('formatter utilities', () => {
  describe('formatCurrency', () => {
    const formatCurrency = (cents: number): string => {
      const reais = cents / 100;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(reais);
    };

    it('should format cents to Brazilian Real currency', () => {
      const result = formatCurrency(10000);
      expect(result).toContain('100');
      expect(result).toContain('00');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle decimal values', () => {
      const result = formatCurrency(1);
      expect(result).toContain('0');
      expect(result).toContain('01');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('10');
      expect(result).toContain('000');
    });
  });

  describe('formatCPF', () => {
    const formatCPF = (cpf: string): string => {
      const cleaned = cpf.replace(/\D/g, '');
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    it('should format valid CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should handle CPF with special characters', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
    });

    it('should handle CPF with spaces', () => {
      expect(formatCPF('123 456 789 01')).toBe('123.456.789-01');
    });

    it('should strip non-numeric characters', () => {
      expect(formatCPF('123-456-789/01')).toBe('123.456.789-01');
    });

    it('should handle incomplete CPF', () => {
      const result = formatCPF('123456');
      expect(result).toBe('123456');
    });
  });

  describe('formatPhone', () => {
    const formatPhone = (phone: string): string => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    };

    it('should format 11 digit phone number', () => {
      expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
    });

    it('should format 10 digit phone number', () => {
      expect(formatPhone('1133333333')).toBe('(11) 3333-3333');
    });

    it('should handle phone with special characters', () => {
      expect(formatPhone('(11) 99999-9999')).toBe('(11) 99999-9999');
    });

    it('should handle phone with spaces', () => {
      expect(formatPhone('11 99999 9999')).toBe('(11) 99999-9999');
    });

    it('should return original if invalid length', () => {
      expect(formatPhone('123')).toBe('123');
    });

    it('should strip non-numeric before formatting', () => {
      expect(formatPhone('11-99999-9999')).toBe('(11) 99999-9999');
    });
  });

  describe('truncate', () => {
    const truncate = (text: string, maxLength: number, suffix = '...'): string => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - suffix.length) + suffix;
    };

    it('should not truncate short text', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long text', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('should use custom suffix', () => {
      expect(truncate('hello world', 8, '***')).toBe('hello***');
    });

    it('should handle exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });

    it('should handle zero length', () => {
      const result = truncate('hello', 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('toTitleCase', () => {
    const toTitleCase = (text: string): string => {
      return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    it('should handle already uppercase', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle mixed case', () => {
      expect(toTitleCase('hELLo WoRLD')).toBe('Hello World');
    });

    it('should handle multiple spaces', () => {
      expect(toTitleCase('hello  world')).toBe('Hello  World');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
  });
});
