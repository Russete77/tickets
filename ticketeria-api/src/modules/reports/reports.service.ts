import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import { SalesReportInput, CheckinReportInput } from './reports.validators';

interface SalesReportData {
  totalRevenueCents: number;
  totalTicketsSold: number;
  batchBreakdown: Array<{
    batchName: string;
    batchType: string;
    priceCents: number;
    quantity: number;
    revenue: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    totalCents: number;
  }>;
  dateBreakdown?: Array<{
    date: string;
    count: number;
    totalCents: number;
  }>;
}

interface CheckinReportData {
  totalCheckedIn: number;
  totalNoShow: number;
  checkinRate: number;
  peakHour?: string;
  hourlyBreakdown: Array<{
    hour: number;
    count: number;
  }>;
  batchBreakdown: Array<{
    batchName: string;
    totalTickets: number;
    checkedIn: number;
    noShow: number;
  }>;
}

interface FinancialReportData {
  grossRevenueCents: number;
  platformFeeCents: number;
  netRevenueCents: number;
  totalTicketsSold: number;
  averageTicketPriceCents: number;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    totalCents: number;
  }>;
}

/**
 * Serviço de relatórios de eventos
 */
export class ReportsService {
  /**
   * Obtém relatório de vendas de um evento
   */
  async getSalesReport(
    eventId: string,
    producerId: string,
    filters?: SalesReportInput,
  ): Promise<SalesReportData> {
    // Validar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para acessar este evento');
    }

    // Filtros de data
    const dateFilter = {
      AND: [
        ...(filters?.dateFrom ? [{ createdAt: { gte: filters.dateFrom } }] : []),
        ...(filters?.dateTo ? [{ createdAt: { lte: filters.dateTo } }] : []),
      ],
    };

    // Buscar orders do evento
    const orders = await prisma.order.findMany({
      where: {
        eventId,
        status: 'paid',
        ...(filters?.dateFrom || filters?.dateTo ? dateFilter : {}),
      },
      include: {
        tickets: {
          include: { batch: true },
        },
      },
    });

    // Calcular métricas gerais
    const totalRevenueCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
    const totalTicketsSold = orders.reduce((sum, order) => sum + order.tickets.length, 0);

    // Breakdown por lote
    const batchMap = new Map<string, { name: string; type: string; price: number; quantity: number }>();
    orders.forEach((order) => {
      order.tickets.forEach((ticket) => {
        const batchKey = ticket.batch.id;
        if (!batchMap.has(batchKey)) {
          batchMap.set(batchKey, {
            name: ticket.batch.name,
            type: ticket.batch.type,
            price: ticket.batch.priceCents,
            quantity: 0,
          });
        }
        const batch = batchMap.get(batchKey)!;
        batch.quantity += 1;
      });
    });

    const batchBreakdown = Array.from(batchMap.entries()).map(([, batch]) => ({
      batchName: batch.name,
      batchType: batch.type,
      priceCents: batch.price,
      quantity: batch.quantity,
      revenue: batch.price * batch.quantity,
    }));

    // Breakdown por método de pagamento
    const paymentMap = new Map<string, { count: number; totalCents: number }>();
    orders.forEach((order) => {
      const key = order.paymentMethod;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, { count: 0, totalCents: 0 });
      }
      const payment = paymentMap.get(key)!;
      payment.count += 1;
      payment.totalCents += order.totalCents;
    });

    const paymentMethodBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      totalCents: data.totalCents,
    }));

    return {
      totalRevenueCents,
      totalTicketsSold,
      batchBreakdown,
      paymentMethodBreakdown,
    };
  }

  /**
   * Obtém relatório de checkin de um evento
   */
  async getCheckinReport(
    eventId: string,
    producerId: string,
  ): Promise<CheckinReportData> {
    // Validar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para acessar este evento');
    }

    // Buscar ingressos do evento
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: { batch: true },
    });

    // Contar checkins
    const checkedInCount = tickets.filter((t) => t.checkedInAt !== null).length;
    const totalCount = tickets.length;
    const noShowCount = totalCount - checkedInCount;

    // Breakdown por lote
    const batchMap = new Map<string, { name: string; total: number; checkedIn: number }>();
    tickets.forEach((ticket) => {
      const batchKey = ticket.batch.id;
      if (!batchMap.has(batchKey)) {
        batchMap.set(batchKey, { name: ticket.batch.name, total: 0, checkedIn: 0 });
      }
      const batch = batchMap.get(batchKey)!;
      batch.total += 1;
      if (ticket.checkedInAt) {
        batch.checkedIn += 1;
      }
    });

    const batchBreakdown = Array.from(batchMap.entries()).map(([, batch]) => ({
      batchName: batch.name,
      totalTickets: batch.total,
      checkedIn: batch.checkedIn,
      noShow: batch.total - batch.checkedIn,
    }));

    // Breakdown por hora (baseado em checkedInAt)
    const hourlyMap = new Map<number, number>();
    tickets.forEach((ticket) => {
      if (ticket.checkedInAt) {
        const hour = new Date(ticket.checkedInAt).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    });

    const hourlyBreakdown = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Encontrar hora de pico
    let peakHour: string | undefined;
    let maxCheckins = 0;
    hourlyBreakdown.forEach((entry) => {
      if (entry.count > maxCheckins) {
        maxCheckins = entry.count;
        peakHour = `${String(entry.hour).padStart(2, '0')}:00`;
      }
    });

    return {
      totalCheckedIn: checkedInCount,
      totalNoShow: noShowCount,
      checkinRate: totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) / 100 : 0,
      peakHour,
      hourlyBreakdown,
      batchBreakdown,
    };
  }

  /**
   * Obtém relatório financeiro de um evento
   */
  async getFinancialReport(
    eventId: string,
    producerId: string,
  ): Promise<FinancialReportData> {
    // Validar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para acessar este evento');
    }

    // Buscar orders pagas
    const orders = await prisma.order.findMany({
      where: {
        eventId,
        status: 'paid',
      },
    });

    // Calcular métricas
    const grossRevenueCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
    const platformFeeCents = orders.reduce((sum, order) => sum + order.platformFeeCents, 0);
    const netRevenueCents = grossRevenueCents - platformFeeCents;
    const totalTicketsSold = orders.reduce((sum, order) => sum + order.tickets?.length || 0, 0);
    const averageTicketPriceCents = totalTicketsSold > 0 ? Math.round(grossRevenueCents / totalTicketsSold) : 0;

    // Breakdown por método de pagamento
    const paymentMap = new Map<string, { count: number; totalCents: number }>();
    orders.forEach((order) => {
      const key = order.paymentMethod;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, { count: 0, totalCents: 0 });
      }
      const payment = paymentMap.get(key)!;
      payment.count += 1;
      payment.totalCents += order.totalCents;
    });

    const paymentMethodBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      totalCents: data.totalCents,
    }));

    return {
      grossRevenueCents,
      platformFeeCents,
      netRevenueCents,
      totalTicketsSold,
      averageTicketPriceCents,
      paymentMethodBreakdown,
    };
  }

  /**
   * Exporta um relatório em formato CSV
   */
  async exportCSV(
    reportType: 'sales' | 'checkin' | 'financial',
    eventId: string,
    producerId: string,
  ): Promise<string> {
    if (reportType === 'sales') {
      const report = await this.getSalesReport(eventId, producerId);
      return this.formatSalesCSV(report);
    } else if (reportType === 'checkin') {
      const report = await this.getCheckinReport(eventId, producerId);
      return this.formatCheckinCSV(report);
    } else if (reportType === 'financial') {
      const report = await this.getFinancialReport(eventId, producerId);
      return this.formatFinancialCSV(report);
    }

    throw new Error('Tipo de relatório inválido');
  }

  /**
   * Formata relatório de vendas como CSV
   */
  private formatSalesCSV(report: SalesReportData): string {
    const lines: string[] = [];

    // Header geral
    lines.push('Relatório de Vendas');
    lines.push('');

    // Métricas gerais
    lines.push('RESUMO GERAL');
    lines.push(`Total de Receita (R$),${(report.totalRevenueCents / 100).toFixed(2)}`);
    lines.push(`Total de Ingressos Vendidos,${report.totalTicketsSold}`);
    lines.push('');

    // Breakdown por lote
    lines.push('VENDAS POR LOTE');
    lines.push('Lote,Tipo,Preço (R$),Quantidade,Receita (R$)');
    report.batchBreakdown.forEach((batch) => {
      lines.push(
        `${batch.batchName},${batch.batchType},${(batch.priceCents / 100).toFixed(2)},${batch.quantity},${(batch.revenue / 100).toFixed(2)}`,
      );
    });
    lines.push('');

    // Breakdown por método de pagamento
    lines.push('VENDAS POR MÉTODO DE PAGAMENTO');
    lines.push('Método,Quantidade,Total (R$)');
    report.paymentMethodBreakdown.forEach((payment) => {
      lines.push(
        `${payment.method},${payment.count},${(payment.totalCents / 100).toFixed(2)}`,
      );
    });

    return lines.join('\n');
  }

  /**
   * Formata relatório de checkin como CSV
   */
  private formatCheckinCSV(report: CheckinReportData): string {
    const lines: string[] = [];

    // Header geral
    lines.push('Relatório de Checkin');
    lines.push('');

    // Métricas gerais
    lines.push('RESUMO GERAL');
    lines.push(`Total de Checkins,${report.totalCheckedIn}`);
    lines.push(`Total de Não Comparecimento,${report.totalNoShow}`);
    lines.push(`Taxa de Checkin,%${(report.checkinRate * 100).toFixed(2)}`);
    lines.push(`Hora de Pico,${report.peakHour || 'N/A'}`);
    lines.push('');

    // Breakdown por lote
    lines.push('CHECKIN POR LOTE');
    lines.push('Lote,Total de Ingressos,Checkins,Não Comparecimento');
    report.batchBreakdown.forEach((batch) => {
      lines.push(
        `${batch.batchName},${batch.totalTickets},${batch.checkedIn},${batch.noShow}`,
      );
    });
    lines.push('');

    // Breakdown por hora
    lines.push('CHECKINS POR HORA');
    lines.push('Hora,Quantidade');
    report.hourlyBreakdown.forEach((entry) => {
      lines.push(`${String(entry.hour).padStart(2, '0')}:00,${entry.count}`);
    });

    return lines.join('\n');
  }

  /**
   * Formata relatório financeiro como CSV
   */
  private formatFinancialCSV(report: FinancialReportData): string {
    const lines: string[] = [];

    // Header geral
    lines.push('Relatório Financeiro');
    lines.push('');

    // Métricas gerais
    lines.push('RESUMO GERAL');
    lines.push(`Receita Bruta (R$),${(report.grossRevenueCents / 100).toFixed(2)}`);
    lines.push(`Taxa de Plataforma (R$),${(report.platformFeeCents / 100).toFixed(2)}`);
    lines.push(`Receita Líquida (R$),${(report.netRevenueCents / 100).toFixed(2)}`);
    lines.push(`Total de Ingressos Vendidos,${report.totalTicketsSold}`);
    lines.push(`Preço Médio do Ingresso (R$),${(report.averageTicketPriceCents / 100).toFixed(2)}`);
    lines.push('');

    // Breakdown por método de pagamento
    lines.push('RECEITA POR MÉTODO DE PAGAMENTO');
    lines.push('Método,Quantidade,Total (R$)');
    report.paymentMethodBreakdown.forEach((payment) => {
      lines.push(
        `${payment.method},${payment.count},${(payment.totalCents / 100).toFixed(2)}`,
      );
    });

    return lines.join('\n');
  }
}

export const reportsService = new ReportsService();
