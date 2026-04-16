import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../shared/errors';

// ============================================================
// Interfaces — uma por aba do Excel
// ============================================================

export interface EventInfo {
  id: string;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  venueAddress: string;
  venueCapacity: number;
  category: string;
  status: string;
}

export interface ExecutiveSummary {
  totalSold: number;
  totalCheckedIn: number;
  grossRevenueCents: number;
  conversionRate: number; // 0–1
  topPromotersByCheckins: Array<{
    promoterName: string;
    checkins: number;
  }>;
  topListsByGuests: Array<{
    listName: string;
    listType: string;
    totalGuests: number;
  }>;
}

export interface GuestEntryRow {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  guestListName: string;   // from GuestListConfig name (or fallback)
  listType: string;
  status: string;
  checkedInAt: Date | null;
  plusOnes: number;
  promoterName: string | null;
}

export interface PromoterRow {
  promoterId: string;
  name: string;
  slug: string;
  tier: string;
  totalGuests: number;
  checkedIn: number;
  conversionPercent: number;
  score: number;
}

export interface GuestListRow {
  id: string;
  name: string;
  listType: string;
  totalEntries: number;
  checkedIn: number;
  noShow: number;
  conversionPercent: number;
}

export interface StaffRow {
  id: string;
  name: string;
  role: string;
  customRole: string | null;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkinsPerformed: number;
}

export interface HourlyCheckinRow {
  hour: string;      // "HH:00"
  count: number;
  cumulative: number;
  isPeak: boolean;
}

export interface GenderRow {
  label: string;
  count: number;
  percent: number;
}

export interface FinancialData {
  grossRevenueCents: number;
  platformFeeCents: number;
  netRevenueCents: number;
  avgTicketPriceCents: number;
  totalTicketsSold: number;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    totalCents: number;
  }>;
  cashless: {
    totalRechargesCents: number;
    totalSpentCents: number;
    totalWallets: number;
  } | null;
}

export interface AdvancedKPIs {
  sellThroughRate: number;       // sold / capacity (0–1)
  checkinRate: number;           // checked-in / sold (0–1)
  noShowRate: number;            // 1 - checkinRate
  avgRevenuePerHeadCents: number;
  peakCheckinRate: number;       // max checkins in any hour / total checked in
  numberOfBatches: number;
  numberOfPromoters: number;     // distinct promoters assigned to event
  numberOfGuestLists: number;    // GuestListConfig count — 1 per event (or 0)
  numberOfGuestListEntries: number;
}

export interface ExcelReportData {
  event: EventInfo;
  executive: ExecutiveSummary;
  guestEntries: GuestEntryRow[];
  promoters: PromoterRow[];
  guestLists: GuestListRow[];
  staff: StaffRow[];
  hourlyCheckins: HourlyCheckinRow[];
  gender: GenderRow[];
  financial: FinancialData;
  kpis: AdvancedKPIs;
}

// ============================================================
// Service
// ============================================================

export class ReportsDataService {
  /**
   * Agrega todos os dados necessários para o relatório Excel de 9 abas.
   * Valida a propriedade do evento pelo producerId antes de qualquer consulta.
   */
  async getExcelReportData(eventId: string, producerId: string): Promise<ExcelReportData> {
    // ── 1. Validar posse do evento ──────────────────────────────────────────
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        producerId: true,
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        venueName: true,
        venueAddress: true,
        venueCapacity: true,
        category: true,
        status: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para acessar este evento');
    }

    // ── 2. Buscar todos os dados em paralelo ────────────────────────────────
    const [
      tickets,
      orders,
      batches,
      guestListConfig,
      eventStaff,
      cashlessConfig,
      formFields,
    ] = await Promise.all([
      // Tickets com batch (para financeiro, checkins, KPIs)
      prisma.ticket.findMany({
        where: { eventId },
        select: {
          id: true,
          status: true,
          priceCents: true,
          checkedInAt: true,
          checkedInBy: true,
          batch: { select: { id: true, name: true, type: true } },
          order: { select: { paymentMethod: true, totalCents: true, platformFeeCents: true, status: true } },
        },
      }),

      // Orders pagas (para financeiro)
      prisma.order.findMany({
        where: { eventId, status: 'paid' },
        select: {
          id: true,
          totalCents: true,
          platformFeeCents: true,
          paymentMethod: true,
        },
      }),

      // Lotes (para KPIs)
      prisma.ticketBatch.findMany({
        where: { eventId },
        select: { id: true, name: true },
      }),

      // GuestListConfig com entries e assignments
      prisma.guestListConfig.findUnique({
        where: { eventId },
        select: {
          id: true,
          maxGuestsTotal: true,
          status: true,
          entries: {
            select: {
              id: true,
              name: true,
              cpf: true,
              phone: true,
              email: true,
              listType: true,
              status: true,
              checkedInAt: true,
              plusOnes: true,
              promoter: {
                select: { id: true, displayName: true },
              },
            },
          },
          promoters: {
            select: {
              id: true,
              guestCount: true,
              checkinCount: true,
              promoter: {
                select: {
                  id: true,
                  displayName: true,
                  slug: true,
                  tier: true,
                  totalGuests: true,
                  totalCheckins: true,
                  conversionRate: true,
                  score: true,
                },
              },
            },
          },
        },
      }),

      // EventStaff
      prisma.eventStaff.findMany({
        where: { eventId },
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          customRole: true,
          shiftStart: true,
          shiftEnd: true,
          checkedIn: true,
          checkedInAt: true,
        },
      }),

      // CashlessConfig
      prisma.cashlessConfig.findUnique({
        where: { eventId },
        select: { id: true, isEnabled: true },
      }),

      // EventFormFields para detecção de gênero
      prisma.eventFormField.findMany({
        where: { eventId },
        select: {
          id: true,
          label: true,
          type: true,
          responses: {
            select: { value: true },
          },
        },
      }),
    ]);

    // ── 3. Agregar cashless (se existir) ────────────────────────────────────
    let cashlessStats: FinancialData['cashless'] = null;
    if (cashlessConfig) {
      const walletAgg = await prisma.cashlessWallet.aggregate({
        where: { eventId },
        _sum: {
          totalTopupCents: true,
          totalSpentCents: true,
        },
        _count: { id: true },
      });

      cashlessStats = {
        totalRechargesCents: walletAgg._sum.totalTopupCents ?? 0,
        totalSpentCents: walletAgg._sum.totalSpentCents ?? 0,
        totalWallets: walletAgg._count.id,
      };
    }

    // ── 4. Buscar checkins realizados por staff (operatorId = staff.userId) ──
    // Apenas se houver staff com userId definido
    const staffUserIds = eventStaff
      .filter((s) => s.userId !== null)
      .map((s) => s.userId as string);

    const checkinsByOperator = new Map<string, number>();
    if (staffUserIds.length > 0) {
      const checkinLogs = await prisma.checkinLog.groupBy({
        by: ['operatorId'],
        where: {
          eventId,
          operatorId: { in: staffUserIds },
          result: 'valid',
        },
        _count: { id: true },
      });

      checkinLogs.forEach((row) => {
        checkinsByOperator.set(row.operatorId, row._count.id);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Monte os dados para cada aba
    // ═══════════════════════════════════════════════════════════════════════

    // ── EventInfo ────────────────────────────────────────────────────────────
    const eventInfo: EventInfo = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      venueCapacity: event.venueCapacity,
      category: event.category,
      status: event.status,
    };

    // ── Tickets ativos/usados (excluir cancelados/refunded da contagem de vendas)
    const soldStatuses: string[] = ['active', 'used', 'transferred'];
    const soldTickets = tickets.filter((t) => soldStatuses.includes(t.status));
    const checkedInTickets = tickets.filter((t) => t.checkedInAt !== null);

    const totalSold = soldTickets.length;
    const totalCheckedIn = checkedInTickets.length;

    // ── Financial ────────────────────────────────────────────────────────────
    const grossRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
    const platformFeeCents = orders.reduce((sum, o) => sum + o.platformFeeCents, 0);
    const netRevenueCents = grossRevenueCents - platformFeeCents;
    const avgTicketPriceCents = totalSold > 0 ? Math.round(grossRevenueCents / totalSold) : 0;

    const paymentMap = new Map<string, { count: number; totalCents: number }>();
    orders.forEach((o) => {
      const entry = paymentMap.get(o.paymentMethod) ?? { count: 0, totalCents: 0 };
      entry.count += 1;
      entry.totalCents += o.totalCents;
      paymentMap.set(o.paymentMethod, entry);
    });

    const financial: FinancialData = {
      grossRevenueCents,
      platformFeeCents,
      netRevenueCents,
      avgTicketPriceCents,
      totalTicketsSold: totalSold,
      paymentMethodBreakdown: Array.from(paymentMap.entries()).map(([method, data]) => ({
        method,
        count: data.count,
        totalCents: data.totalCents,
      })),
      cashless: cashlessStats,
    };

    // ── Hourly Checkins ─────────────────────────────────────────────────────
    const hourlyMap = new Map<number, number>();
    checkedInTickets.forEach((t) => {
      const hour = new Date(t.checkedInAt!).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
    });

    const sortedHours = Array.from(hourlyMap.entries()).sort((a, b) => a[0] - b[0]);
    const peakCount = sortedHours.reduce((max, [, count]) => Math.max(max, count), 0);

    let cumulative = 0;
    const hourlyCheckins: HourlyCheckinRow[] = sortedHours.map(([hour, count]) => {
      cumulative += count;
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        count,
        cumulative,
        isPeak: count === peakCount && peakCount > 0,
      };
    });

    // ── Guest Entries ────────────────────────────────────────────────────────
    const guestEntries: GuestEntryRow[] = [];
    const guestListRows: GuestListRow[] = [];
    const promoterMap = new Map<string, PromoterRow>();

    if (guestListConfig) {
      // Guest list row (only one config per event by unique constraint)
      const entries = guestListConfig.entries;
      const checkedInEntries = entries.filter((e) => e.status === 'checked_in');
      const noShowEntries = entries.filter(
        (e) => e.status === 'no_show' || (e.status !== 'checked_in' && e.status !== 'pending' && e.status !== 'confirmed'),
      );

      // Aggregate by listType for the guest lists tab
      const listTypeMap = new Map<string, { total: number; checkedIn: number }>();
      entries.forEach((e) => {
        const key = e.listType;
        const agg = listTypeMap.get(key) ?? { total: 0, checkedIn: 0 };
        agg.total += 1 + e.plusOnes;
        if (e.status === 'checked_in') agg.checkedIn += 1;
        listTypeMap.set(key, agg);
      });

      listTypeMap.forEach((agg, listType) => {
        const noShow = agg.total - agg.checkedIn;
        guestListRows.push({
          id: guestListConfig.id,
          name: `Lista ${listType}`,
          listType,
          totalEntries: agg.total,
          checkedIn: agg.checkedIn,
          noShow,
          conversionPercent:
            agg.total > 0 ? Math.round((agg.checkedIn / agg.total) * 10000) / 100 : 0,
        });
      });

      // Guest entry rows
      entries.forEach((e) => {
        guestEntries.push({
          id: e.id,
          name: e.name,
          cpf: e.cpf,
          phone: e.phone,
          email: e.email,
          guestListName: `Lista ${e.listType}`,
          listType: e.listType,
          status: e.status,
          checkedInAt: e.checkedInAt,
          plusOnes: e.plusOnes,
          promoterName: e.promoter?.displayName ?? null,
        });
      });

      // Promoter rows (from assignments to this event's config)
      guestListConfig.promoters.forEach((assignment) => {
        const p = assignment.promoter;
        const existing = promoterMap.get(p.id);
        if (existing) {
          // Multiple assignments for same promoter — accumulate
          existing.totalGuests += assignment.guestCount;
          existing.checkedIn += assignment.checkinCount;
        } else {
          const convPct =
            assignment.guestCount > 0
              ? Math.round((assignment.checkinCount / assignment.guestCount) * 10000) / 100
              : 0;
          promoterMap.set(p.id, {
            promoterId: p.id,
            name: p.displayName,
            slug: p.slug,
            tier: p.tier,
            totalGuests: assignment.guestCount,
            checkedIn: assignment.checkinCount,
            conversionPercent: convPct,
            score: p.score,
          });
        }
      });

      // Recalculate conversionPercent after accumulation
      promoterMap.forEach((row) => {
        row.conversionPercent =
          row.totalGuests > 0
            ? Math.round((row.checkedIn / row.totalGuests) * 10000) / 100
            : 0;
      });
    }

    const promoters = Array.from(promoterMap.values()).sort(
      (a, b) => b.checkedIn - a.checkedIn,
    );

    // ── Staff ────────────────────────────────────────────────────────────────
    const staff: StaffRow[] = eventStaff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      customRole: s.customRole,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
      checkedIn: s.checkedIn,
      checkedInAt: s.checkedInAt,
      checkinsPerformed: s.userId ? (checkinsByOperator.get(s.userId) ?? 0) : 0,
    }));

    // ── Gender ───────────────────────────────────────────────────────────────
    const genderKeywords = ['genero', 'género', 'sexo', 'gender'];
    const genderField = formFields.find((f) =>
      genderKeywords.some((kw) => f.label.toLowerCase().includes(kw)),
    );

    let gender: GenderRow[] = [];
    if (genderField && genderField.responses.length > 0) {
      const genderCount = new Map<string, number>();
      genderField.responses.forEach((r) => {
        const val = r.value.trim().toLowerCase();
        genderCount.set(val, (genderCount.get(val) ?? 0) + 1);
      });
      const total = genderField.responses.length;
      gender = Array.from(genderCount.entries()).map(([label, count]) => ({
        label,
        count,
        percent: Math.round((count / total) * 10000) / 100,
      }));
    }

    // ── Executive Summary ────────────────────────────────────────────────────
    const topPromotersByCheckins = promoters.slice(0, 3).map((p) => ({
      promoterName: p.name,
      checkins: p.checkedIn,
    }));

    const topListsByGuests = [...guestListRows]
      .sort((a, b) => b.totalEntries - a.totalEntries)
      .slice(0, 3)
      .map((gl) => ({
        listName: gl.name,
        listType: gl.listType,
        totalGuests: gl.totalEntries,
      }));

    const executive: ExecutiveSummary = {
      totalSold,
      totalCheckedIn,
      grossRevenueCents,
      conversionRate: totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 10000) / 10000 : 0,
      topPromotersByCheckins,
      topListsByGuests,
    };

    // ── Advanced KPIs ────────────────────────────────────────────────────────
    const maxHourlyCheckins =
      sortedHours.length > 0 ? Math.max(...sortedHours.map(([, c]) => c)) : 0;

    const kpis: AdvancedKPIs = {
      sellThroughRate:
        event.venueCapacity > 0
          ? Math.round((totalSold / event.venueCapacity) * 10000) / 10000
          : 0,
      checkinRate:
        totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 10000) / 10000 : 0,
      noShowRate:
        totalSold > 0
          ? Math.round(((totalSold - totalCheckedIn) / totalSold) * 10000) / 10000
          : 0,
      avgRevenuePerHeadCents:
        totalCheckedIn > 0 ? Math.round(grossRevenueCents / totalCheckedIn) : 0,
      peakCheckinRate:
        totalCheckedIn > 0 ? Math.round((maxHourlyCheckins / totalCheckedIn) * 10000) / 10000 : 0,
      numberOfBatches: batches.length,
      numberOfPromoters: promoters.length,
      numberOfGuestLists: guestListConfig ? 1 : 0,
      numberOfGuestListEntries: guestEntries.length,
    };

    return {
      event: eventInfo,
      executive,
      guestEntries,
      promoters,
      guestLists: guestListRows,
      staff,
      hourlyCheckins,
      gender,
      financial,
      kpis,
    };
  }
}

export const reportsDataService = new ReportsDataService();
