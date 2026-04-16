import ExcelJS from 'exceljs';
import {
  ExcelReportData,
  GuestEntryRow,
  PromoterRow,
  GuestListRow,
  StaffRow,
  HourlyCheckinRow,
  GenderRow,
} from './reports.data.service';

// ============================================================
// Design palette
// ============================================================

const COLORS = {
  primary: '7C3AED',       // PulsePass purple
  primaryLight: 'F5F3FF',  // light purple bg
  white: 'FFFFFF',
  success: '10B981',       // green
  danger: 'EF4444',        // red
  warning: 'F59E0B',       // gold
  dataBar: '8B5CF6',       // lighter purple
  headerText: 'FFFFFF',
  bodyText: '1F2937',
};

// ============================================================
// ExcelReportBuilder
// ============================================================

export class ExcelReportBuilder {
  private workbook: ExcelJS.Workbook;
  private data: ExcelReportData;

  constructor(data: ExcelReportData) {
    this.workbook = new ExcelJS.Workbook();
    this.data = data;
    this.workbook.creator = 'PulsePass';
    this.workbook.created = new Date();
  }

  async build(): Promise<ExcelJS.Workbook> {
    this.buildResumoExecutivo();
    this.buildListaConvidados();
    this.buildPorPromoter();
    this.buildPorLista();
    this.buildPorHostess();
    this.buildAnaliseTemporal();
    this.buildPorGenero();
    this.buildCashlessFinanceiro();
    this.buildKPIsAvancados();
    return this.workbook;
  }

  async toBuffer(): Promise<Buffer> {
    await this.build();
    return Buffer.from(await this.workbook.xlsx.writeBuffer());
  }

  // ──────────────────────────────────────────────────────────
  // Styling helpers
  // ──────────────────────────────────────────────────────────

  private styleHeader(sheet: ExcelJS.Worksheet, rowNumber: number, colCount: number): void {
    const row = sheet.getRow(rowNumber);
    for (let col = 1; col <= colCount; col++) {
      const cell = row.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${COLORS.primary}` },
      };
      cell.font = { color: { argb: `FF${COLORS.headerText}` }, bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: `FF${COLORS.primary}` } },
      };
    }
    row.height = 25;
  }

  private addDataRow(sheet: ExcelJS.Worksheet, row: ExcelJS.Row, isAlternate: boolean): void {
    const bgColor = isAlternate ? `FF${COLORS.primaryLight}` : `FF${COLORS.white}`;
    const colCount = sheet.columnCount || 10;
    for (let col = 1; col <= colCount; col++) {
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.font = { color: { argb: `FF${COLORS.bodyText}` }, size: 10 };
      cell.alignment = { vertical: 'middle' };
    }
    row.height = 20;
  }

  private formatCurrency(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2)}`;
  }

  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${min}`;
  }

  private addSubtitle(sheet: ExcelJS.Worksheet, text: string): number {
    const rowNum = sheet.rowCount + 1;
    const row = sheet.getRow(rowNum);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { bold: true, color: { argb: `FF${COLORS.primary}` }, size: 12 };
    cell.alignment = { vertical: 'middle' };
    row.height = 22;
    row.commit();
    return rowNum;
  }

  private addKpiRow(
    sheet: ExcelJS.Worksheet,
    label: string,
    value: string | number,
    isAlternate: boolean,
  ): void {
    const row = sheet.addRow([label, value]);
    const bgColor = isAlternate ? `FF${COLORS.primaryLight}` : `FF${COLORS.white}`;
    [1, 2].forEach((col) => {
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.font = { color: { argb: `FF${COLORS.bodyText}` }, size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
    row.getCell(1).font = { bold: true, color: { argb: `FF${COLORS.bodyText}` }, size: 10 };
    row.height = 20;
    row.commit();
  }

  // ──────────────────────────────────────────────────────────
  // Tab 1 — Resumo Executivo
  // ──────────────────────────────────────────────────────────

  private buildResumoExecutivo(): void {
    const { event, executive } = this.data;
    const sheet = this.workbook.addWorksheet('Resumo Executivo');

    sheet.columns = [
      { key: 'label', width: 30 },
      { key: 'value', width: 40 },
    ];

    // Title row (merged, purple bg, white text, bold, size 16)
    sheet.mergeCells('A1:B1');
    const titleRow = sheet.getRow(1);
    const titleCell = titleRow.getCell(1);
    titleCell.value = `Relatorio Pos-Evento — ${event.title}`;
    titleCell.font = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 16 };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${COLORS.primary}` },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 36;
    titleRow.commit();

    // Blank row
    sheet.addRow([]);

    // Event info rows
    const startsAt = this.formatDate(event.startsAt);
    const infoRows = [
      ['Data', startsAt],
      ['Local', `${event.venueName} — ${event.venueAddress}`],
      ['Capacidade', event.venueCapacity],
    ];
    infoRows.forEach(([label, value], idx) => {
      const row = sheet.addRow([label, value]);
      [1, 2].forEach((col) => {
        const cell = row.getCell(col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx % 2 === 0 ? `FF${COLORS.primaryLight}` : `FF${COLORS.white}` },
        };
        cell.font = { size: 10, color: { argb: `FF${COLORS.bodyText}` } };
        cell.alignment = { vertical: 'middle' };
      });
      row.getCell(1).font = { bold: true, size: 10, color: { argb: `FF${COLORS.bodyText}` } };
      row.height = 20;
      row.commit();
    });

    // Blank row
    sheet.addRow([]);

    // KPIs Principais subtitle
    this.addSubtitle(sheet, 'KPIs Principais');

    // 4 KPI rows
    const kpiRows: [string, string | number, boolean][] = [
      ['Total Vendido', executive.totalSold, false],
      ['Total Check-ins', executive.totalCheckedIn, true],
      ['Receita Bruta', this.formatCurrency(executive.grossRevenueCents), false],
      ['Taxa de Conversao', this.formatPercent(executive.conversionRate), true],
    ];
    kpiRows.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));

    // Blank row
    sheet.addRow([]);

    // Top 3 Promoters subtitle + table
    this.addSubtitle(sheet, 'Top 3 Promoters');
    if (executive.topPromotersByCheckins.length === 0) {
      sheet.addRow(['Nenhum promoter registrado']);
    } else {
      const hdrRow = sheet.addRow(['Promoter', 'Check-ins']);
      this.styleHeader(sheet, hdrRow.number, 2);
      executive.topPromotersByCheckins.forEach((p, i) => {
        const row = sheet.addRow([p.promoterName, p.checkins]);
        this.addDataRow(sheet, row, i % 2 === 1);
        row.commit();
      });
    }

    // Blank row
    sheet.addRow([]);

    // Top 3 Listas subtitle + table
    this.addSubtitle(sheet, 'Top 3 Listas');
    if (executive.topListsByGuests.length === 0) {
      sheet.addRow(['Nenhuma lista registrada']);
    } else {
      const hdrRow2 = sheet.addRow(['Lista', 'Tipo', 'Total Convidados']);
      this.styleHeader(sheet, hdrRow2.number, 3);
      executive.topListsByGuests.forEach((l, i) => {
        const row = sheet.addRow([l.listName, l.listType, l.totalGuests]);
        this.addDataRow(sheet, row, i % 2 === 1);
        row.commit();
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // Tab 2 — Lista de Convidados
  // ──────────────────────────────────────────────────────────

  private buildListaConvidados(): void {
    const { guestEntries } = this.data;
    const sheet = this.workbook.addWorksheet('Lista de Convidados');

    sheet.columns = [
      { header: 'Nome',          key: 'name',          width: 25 },
      { header: 'CPF',           key: 'cpf',           width: 16 },
      { header: 'Telefone',      key: 'phone',         width: 16 },
      { header: 'Email',         key: 'email',         width: 30 },
      { header: 'Lista',         key: 'guestListName', width: 20 },
      { header: 'Tipo',          key: 'listType',      width: 14 },
      { header: 'Status',        key: 'status',        width: 14 },
      { header: 'Check-in em',   key: 'checkedInAt',   width: 18 },
      { header: 'Acompanhantes', key: 'plusOnes',      width: 14 },
    ];

    // Style header row (row 1)
    this.styleHeader(sheet, 1, 9);

    // Frozen header + auto-filter
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'I1' };

    guestEntries.forEach((entry: GuestEntryRow, i: number) => {
      const row = sheet.addRow([
        entry.name,
        entry.cpf ?? '',
        entry.phone ?? '',
        entry.email ?? '',
        entry.guestListName,
        entry.listType,
        entry.status,
        this.formatDate(entry.checkedInAt),
        entry.plusOnes,
      ]);

      this.addDataRow(sheet, row, i % 2 === 1);

      // Status cell color override
      const statusCell = row.getCell(7);
      if (entry.status === 'checked_in') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${COLORS.success}` },
        };
        statusCell.font = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 10 };
      } else if (entry.status === 'no_show') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${COLORS.danger}` },
        };
        statusCell.font = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 10 };
      }

      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 3 — Por Promoter
  // ──────────────────────────────────────────────────────────

  private buildPorPromoter(): void {
    const sheet = this.workbook.addWorksheet('Por Promoter');

    sheet.columns = [
      { header: 'Promoter',           key: 'name',              width: 25 },
      { header: 'Total Convidados',   key: 'totalGuests',       width: 16 },
      { header: 'Check-ins',          key: 'checkedIn',         width: 12 },
      { header: 'Conversao %',        key: 'conversionPercent', width: 14 },
      { header: 'Score',              key: 'score',             width: 12 },
      { header: 'Tier',               key: 'tier',              width: 12 },
    ];

    this.styleHeader(sheet, 1, 6);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'F1' };

    // Sort by conversion descending
    const sorted = [...this.data.promoters].sort(
      (a: PromoterRow, b: PromoterRow) => b.conversionPercent - a.conversionPercent,
    );

    sorted.forEach((p: PromoterRow, i: number) => {
      const row = sheet.addRow([
        p.name,
        p.totalGuests,
        p.checkedIn,
        `${p.conversionPercent.toFixed(1)}%`,
        p.score,
        p.tier,
      ]);
      this.addDataRow(sheet, row, i % 2 === 1);
      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 4 — Por Lista
  // ──────────────────────────────────────────────────────────

  private buildPorLista(): void {
    const sheet = this.workbook.addWorksheet('Por Lista');

    sheet.columns = [
      { header: 'Nome da Lista', key: 'name',              width: 25 },
      { header: 'Tipo',          key: 'listType',          width: 14 },
      { header: 'Total',         key: 'totalEntries',      width: 12 },
      { header: 'Check-ins',     key: 'checkedIn',         width: 12 },
      { header: 'No-show',       key: 'noShow',            width: 12 },
      { header: 'Conversao %',   key: 'conversionPercent', width: 14 },
    ];

    this.styleHeader(sheet, 1, 6);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'F1' };

    this.data.guestLists.forEach((gl: GuestListRow, i: number) => {
      const row = sheet.addRow([
        gl.name,
        gl.listType,
        gl.totalEntries,
        gl.checkedIn,
        gl.noShow,
        `${gl.conversionPercent.toFixed(1)}%`,
      ]);
      this.addDataRow(sheet, row, i % 2 === 1);
      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 5 — Por Hostess
  // ──────────────────────────────────────────────────────────

  private buildPorHostess(): void {
    const sheet = this.workbook.addWorksheet('Por Hostess');

    sheet.columns = [
      { header: 'Nome',               key: 'name',               width: 25 },
      { header: 'Funcao',             key: 'role',               width: 16 },
      { header: 'Turno Inicio',       key: 'shiftStart',         width: 18 },
      { header: 'Turno Fim',          key: 'shiftEnd',           width: 18 },
      { header: 'Check-in Proprio',   key: 'checkedIn',          width: 16 },
      { header: 'Check-ins Realizados', key: 'checkinsPerformed', width: 18 },
    ];

    this.styleHeader(sheet, 1, 6);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    this.data.staff.forEach((s: StaffRow, i: number) => {
      const displayRole = s.customRole ?? s.role;
      const row = sheet.addRow([
        s.name,
        displayRole,
        this.formatDate(s.shiftStart),
        this.formatDate(s.shiftEnd),
        s.checkedIn ? 'Sim' : 'Nao',
        s.checkinsPerformed,
      ]);
      this.addDataRow(sheet, row, i % 2 === 1);
      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 6 — Analise Temporal
  // ──────────────────────────────────────────────────────────

  private buildAnaliseTemporal(): void {
    const sheet = this.workbook.addWorksheet('Analise Temporal');

    sheet.columns = [
      { header: 'Hora',       key: 'hour',       width: 12 },
      { header: 'Check-ins',  key: 'count',      width: 12 },
      { header: 'Acumulado',  key: 'cumulative', width: 12 },
    ];

    this.styleHeader(sheet, 1, 3);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    this.data.hourlyCheckins.forEach((h: HourlyCheckinRow, i: number) => {
      const row = sheet.addRow([h.hour, h.count, h.cumulative]);
      this.addDataRow(sheet, row, i % 2 === 1);

      // Peak hour gets gold background
      if (h.isPeak) {
        [1, 2, 3].forEach((col) => {
          const cell = row.getCell(col);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${COLORS.warning}` },
          };
          cell.font = { bold: true, color: { argb: `FF${COLORS.bodyText}` }, size: 10 };
        });
      }

      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 7 — Por Genero
  // ──────────────────────────────────────────────────────────

  private buildPorGenero(): void {
    const sheet = this.workbook.addWorksheet('Por Genero');

    if (this.data.gender.length === 0) {
      sheet.getCell('A1').value = 'Dados de genero nao disponiveis para este evento';
      sheet.getCell('A1').font = { italic: true, color: { argb: `FF${COLORS.bodyText}` }, size: 11 };
      return;
    }

    sheet.columns = [
      { header: 'Genero',       key: 'label',   width: 20 },
      { header: 'Quantidade',   key: 'count',   width: 14 },
      { header: 'Porcentagem %', key: 'percent', width: 14 },
    ];

    this.styleHeader(sheet, 1, 3);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    this.data.gender.forEach((g: GenderRow, i: number) => {
      const row = sheet.addRow([g.label, g.count, `${g.percent.toFixed(1)}%`]);
      this.addDataRow(sheet, row, i % 2 === 1);
      row.commit();
    });
  }

  // ──────────────────────────────────────────────────────────
  // Tab 8 — Cashless e Financeiro
  // ──────────────────────────────────────────────────────────

  private buildCashlessFinanceiro(): void {
    const { financial } = this.data;
    const sheet = this.workbook.addWorksheet('Cashless e Financeiro');

    sheet.columns = [
      { key: 'label', width: 30 },
      { key: 'value', width: 30 },
    ];

    // ── Section 1: Receita ──────────────────────────────────
    this.addSubtitle(sheet, 'Receita');

    const revenueKpis: [string, string | number, boolean][] = [
      ['Receita Bruta',    this.formatCurrency(financial.grossRevenueCents),    false],
      ['Taxa Plataforma',  this.formatCurrency(financial.platformFeeCents),     true],
      ['Receita Liquida',  this.formatCurrency(financial.netRevenueCents),      false],
      ['Preco Medio',      this.formatCurrency(financial.avgTicketPriceCents),  true],
      ['Total Vendidos',   financial.totalTicketsSold,                         false],
    ];
    revenueKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));

    // Blank row
    sheet.addRow([]);

    // ── Section 2: Por Metodo de Pagamento ──────────────────
    this.addSubtitle(sheet, 'Por Metodo de Pagamento');

    if (financial.paymentMethodBreakdown.length === 0) {
      sheet.addRow(['Nenhum pagamento registrado']);
    } else {
      const hdrRow = sheet.addRow(['Metodo', 'Quantidade', 'Total']);
      this.styleHeader(sheet, hdrRow.number, 3);

      financial.paymentMethodBreakdown.forEach((pm, i) => {
        const row = sheet.addRow([pm.method, pm.count, this.formatCurrency(pm.totalCents)]);
        this.addDataRow(sheet, row, i % 2 === 1);
        row.commit();
      });
    }

    // ── Section 3: Cashless (if exists) ─────────────────────
    if (financial.cashless) {
      sheet.addRow([]);
      this.addSubtitle(sheet, 'Cashless');

      const cashlessKpis: [string, string | number, boolean][] = [
        ['Total Recargas',    this.formatCurrency(financial.cashless.totalRechargesCents), false],
        ['Total Consumido',   this.formatCurrency(financial.cashless.totalSpentCents),     true],
        ['Total de Carteiras', financial.cashless.totalWallets,                            false],
      ];
      cashlessKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));
    }
  }

  // ──────────────────────────────────────────────────────────
  // Tab 9 — KPIs Avancados
  // ──────────────────────────────────────────────────────────

  private buildKPIsAvancados(): void {
    const { kpis, financial } = this.data;
    const sheet = this.workbook.addWorksheet('KPIs Avancados');

    sheet.columns = [
      { key: 'label', width: 35 },
      { key: 'value', width: 30 },
    ];

    type KpiEntry = [string, string | number, boolean];

    // ── Vendas ──────────────────────────────────────────────
    this.addSubtitle(sheet, 'Vendas');
    const vendasKpis: KpiEntry[] = [
      ['Taxa de Sell-Through',  this.formatPercent(kpis.sellThroughRate),  false],
      ['Total de Ingressos Vendidos', kpis.numberOfGuestListEntries > 0
        ? kpis.numberOfGuestListEntries
        : financial.totalTicketsSold, true],
      ['Numero de Lotes',       kpis.numberOfBatches,                      false],
    ];
    vendasKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));

    // Blank row
    sheet.addRow([]);

    // ── Check-in ────────────────────────────────────────────
    this.addSubtitle(sheet, 'Check-in');
    const checkinKpis: KpiEntry[] = [
      ['Taxa de Check-in',      this.formatPercent(kpis.checkinRate),      false],
      ['Taxa de No-show',       this.formatPercent(kpis.noShowRate),       true],
      ['Taxa de Pico de Check-in', this.formatPercent(kpis.peakCheckinRate), false],
    ];
    checkinKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));

    // Blank row
    sheet.addRow([]);

    // ── Guest Lists ─────────────────────────────────────────
    this.addSubtitle(sheet, 'Guest Lists');
    const guestListKpis: KpiEntry[] = [
      ['Numero de Listas',            kpis.numberOfGuestLists,       false],
      ['Entradas na Lista de Convidados', kpis.numberOfGuestListEntries, true],
      ['Numero de Promoters',         kpis.numberOfPromoters,        false],
    ];
    guestListKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));

    // Blank row
    sheet.addRow([]);

    // ── Financeiro ──────────────────────────────────────────
    this.addSubtitle(sheet, 'Financeiro');
    const finKpis: KpiEntry[] = [
      ['Receita Media por Pessoa',  this.formatCurrency(kpis.avgRevenuePerHeadCents), false],
      ['Receita Bruta',             this.formatCurrency(financial.grossRevenueCents),  true],
      ['Receita Liquida',           this.formatCurrency(financial.netRevenueCents),    false],
    ];
    finKpis.forEach(([label, value, alt]) => this.addKpiRow(sheet, label, value, alt));
  }
}
