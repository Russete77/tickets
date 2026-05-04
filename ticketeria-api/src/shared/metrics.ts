/**
 * Registro de métricas no formato Prometheus exposition.
 *
 * Implementação leve, sem dependência externa.
 */

type LabelValues = Record<string, string>;

const escapeLabel = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

const formatLabels = (labels: LabelValues): string => {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return `{${keys.map((k) => `${k}="${escapeLabel(labels[k] ?? '')}"`).join(',')}}`;
};

const labelKey = (labels: LabelValues): string => {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k] ?? ''}`).join('|');
};

class Counter {
  private values = new Map<string, { labels: LabelValues; value: number }>();
  constructor(
    private readonly name: string,
    private readonly help: string,
  ) {}
  inc(labels: LabelValues = {}, amount = 1): void {
    const key = labelKey(labels);
    const existing = this.values.get(key);
    if (existing) existing.value += amount;
    else this.values.set(key, { labels, value: amount });
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${formatLabels(labels)} ${value}`);
    }
    return lines.join('\n');
  }
}

class Gauge {
  private values = new Map<string, { labels: LabelValues; value: number }>();
  constructor(
    private readonly name: string,
    private readonly help: string,
  ) {}
  set(value: number, labels: LabelValues = {}): void {
    this.values.set(labelKey(labels), { labels, value });
  }
  inc(amount: number, labels: LabelValues = {}): void {
    const key = labelKey(labels);
    const existing = this.values.get(key);
    this.values.set(key, { labels, value: (existing?.value ?? 0) + amount });
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${formatLabels(labels)} ${value}`);
    }
    return lines.join('\n');
  }
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

class Histogram {
  private buckets = new Map<
    string,
    { labels: LabelValues; counts: number[]; sum: number; count: number }
  >();
  constructor(
    private readonly name: string,
    private readonly help: string,
    private readonly bucketBoundaries: number[] = DEFAULT_BUCKETS,
  ) {}
  observe(value: number, labels: LabelValues = {}): void {
    const key = labelKey(labels);
    const existing = this.buckets.get(key) ?? {
      labels,
      counts: new Array(this.bucketBoundaries.length).fill(0),
      sum: 0,
      count: 0,
    };
    for (let i = 0; i < this.bucketBoundaries.length; i += 1) {
      if (value <= this.bucketBoundaries[i]) {
        existing.counts[i] += 1;
      }
    }
    existing.sum += value;
    existing.count += 1;
    this.buckets.set(key, existing);
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const { labels, counts, sum, count } of this.buckets.values()) {
      this.bucketBoundaries.forEach((bound, idx) => {
        lines.push(
          `${this.name}_bucket${formatLabels({ ...labels, le: String(bound) })} ${counts[idx]}`,
        );
      });
      lines.push(`${this.name}_bucket${formatLabels({ ...labels, le: '+Inf' })} ${count}`);
      lines.push(`${this.name}_sum${formatLabels(labels)} ${sum}`);
      lines.push(`${this.name}_count${formatLabels(labels)} ${count}`);
    }
    return lines.join('\n');
  }
}

// Métricas oficiais
export const httpRequestsTotal = new Counter(
  'pulsepass_http_requests_total',
  'Total de requisições HTTP recebidas',
);
export const httpRequestDuration = new Histogram(
  'pulsepass_http_request_duration_seconds',
  'Latência de requisições HTTP em segundos',
);
export const checkinValidationsTotal = new Counter(
  'pulsepass_checkin_validations_total',
  'Total de validações de check-in (incluindo rejeições)',
);
export const checkinValidationDuration = new Histogram(
  'pulsepass_checkin_validation_seconds',
  'Latência de validação de check-in em segundos',
  [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2],
);
export const ticketReservationsTotal = new Counter(
  'pulsepass_ticket_reservations_total',
  'Total de tentativas de reserva de ingresso',
);
export const cashlessTransactionsTotal = new Counter(
  'pulsepass_cashless_transactions_total',
  'Total de transações cashless processadas',
);
export const queueDepthGauge = new Gauge(
  'pulsepass_queue_depth',
  'Profundidade atual de filas BullMQ',
);
export const circuitBreakerState = new Gauge(
  'pulsepass_circuit_breaker_state',
  'Estado do circuit breaker (0=closed, 1=half_open, 2=open)',
);

// Métricas adicionadas — Auditoria CTO 2026-05
export const pushDeliveredCounter = new Counter(
  'pulsepass_push_delivered_total',
  'Push notifications entregues (label: provider=expo|fcm)',
);
export const pushFailedCounter = new Counter(
  'pulsepass_push_failed_total',
  'Push notifications falhadas (label: reason)',
);
export const paymentFailoverCounter = new Counter(
  'pulsepass_payment_failover_total',
  'Quantas vezes o gateway secundário foi acionado (labels: from, to)',
);
export const webhookOutboundDeliveredCounter = new Counter(
  'pulsepass_webhook_outbound_delivered_total',
  'Webhooks outbound entregues (label: event_type)',
);
export const webhookOutboundFailedCounter = new Counter(
  'pulsepass_webhook_outbound_failed_total',
  'Webhooks outbound que falharam (label: event_type)',
);
export const searchQueryCounter = new Counter(
  'pulsepass_search_queries_total',
  'Busca de eventos (label: source=meili|postgres)',
);
export const ledgerEntriesCounter = new Counter(
  'pulsepass_ledger_entries_total',
  'Entradas postadas no ledger (label: source_type)',
);
export const ledgerInvariantViolationCounter = new Counter(
  'pulsepass_ledger_invariant_violations_total',
  'Violacoes de invariante detectadas em fechamento de evento',
);

export function renderMetrics(): string {
  return [
    httpRequestsTotal.render(),
    httpRequestDuration.render(),
    checkinValidationsTotal.render(),
    checkinValidationDuration.render(),
    ticketReservationsTotal.render(),
    cashlessTransactionsTotal.render(),
    queueDepthGauge.render(),
    circuitBreakerState.render(),
    pushDeliveredCounter.render(),
    pushFailedCounter.render(),
    paymentFailoverCounter.render(),
    webhookOutboundDeliveredCounter.render(),
    webhookOutboundFailedCounter.render(),
    searchQueryCounter.render(),
    ledgerEntriesCounter.render(),
    ledgerInvariantViolationCounter.render(),
  ].join('\n\n') + '\n';
}
