import { logger } from './logger';

/**
 * Circuit Breaker leve, sem dependência externa.
 *
 * Estados:
 *   - CLOSED: requisições passam normalmente.
 *   - OPEN:   após `failureThreshold` falhas consecutivas, todas as chamadas falham
 *             rapidamente por `resetTimeoutMs`. Útil para evitar cascata de timeouts
 *             quando uma API externa está degradada (Asaas, Resend).
 *   - HALF_OPEN: após o timeout, a próxima chamada é permitida; se passar, fecha;
 *             se falhar, reabre.
 *
 * Padrão Hystrix simplificado, suficiente para SaaS de eventos.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Nome usado em logs (ex: 'asaas', 'resend') */
  name: string;
  /** Falhas consecutivas que disparam abertura (default: 5) */
  failureThreshold?: number;
  /** Tempo até tentar fechar novamente em ms (default: 30s) */
  resetTimeoutMs?: number;
  /** Timeout individual de cada chamada em ms (default: 10s) */
  callTimeoutMs?: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" está aberto`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private nextAttemptAt = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly callTimeoutMs: number;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
    this.callTimeoutMs = opts.callTimeoutMs ?? 10_000;
  }

  /**
   * Executa `fn` protegido pelo breaker.
   * Lança `CircuitBreakerOpenError` quando o breaker está aberto.
   * Lança o erro original em caso de falha real (ou Timeout após callTimeoutMs).
   */
  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptAt) {
        throw new CircuitBreakerOpenError(this.name);
      }
      // Tempo passou: tenta uma chamada de "sondagem"
      this.state = 'HALF_OPEN';
      logger.warn(`[circuit:${this.name}] HALF_OPEN — tentando sondagem`);
    }

    try {
      const result = await this.withTimeout(fn());
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`[circuit:${this.name}] timeout após ${this.callTimeoutMs}ms`));
      }, this.callTimeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      );
    });
  }

  private onSuccess(): void {
    if (this.state !== 'CLOSED') {
      logger.info(`[circuit:${this.name}] CLOSED — sondagem bem-sucedida`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(err: unknown): void {
    this.failures += 1;
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`[circuit:${this.name}] falha ${this.failures}/${this.failureThreshold}: ${message}`);

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
      logger.error(
        `[circuit:${this.name}] OPEN — bloqueando por ${this.resetTimeoutMs}ms`,
      );
    }
  }

  /** Diagnóstico para health check / dashboard */
  snapshot(): { name: string; state: CircuitState; failures: number; nextAttemptAt: number | null } {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      nextAttemptAt: this.state === 'OPEN' ? this.nextAttemptAt : null,
    };
  }
}

// Instâncias compartilhadas para APIs externas críticas
export const asaasBreaker = new CircuitBreaker({
  name: 'asaas',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  callTimeoutMs: 15_000,
});

export const resendBreaker = new CircuitBreaker({
  name: 'resend',
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  callTimeoutMs: 10_000,
});

export const expoPushBreaker = new CircuitBreaker({
  name: 'expo-push',
  failureThreshold: 10,
  resetTimeoutMs: 60_000,
  callTimeoutMs: 15_000,
});
