import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { reportsDataService } from './reports.data.service';
import { ExcelReportBuilder } from './reports.excel.service';
import { SalesReportInput, CheckinReportInput, ExportReportInput } from './reports.validators';

/**
 * Controladores para relatórios
 */

export class ReportsController {
  /**
   * GET /reports/sales/:eventId
   * Obter relatório de vendas
   */
  static async getSalesReport(
    req: Request<{ eventId: string }, unknown, unknown, SalesReportInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;
      const filters = req.query as SalesReportInput;

      const report = await reportsService.getSalesReport(eventId, userId, filters);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/checkin/:eventId
   * Obter relatório de checkin
   */
  static async getCheckinReport(
    req: Request<{ eventId: string }, unknown, unknown, CheckinReportInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;

      const report = await reportsService.getCheckinReport(eventId, userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/financial/:eventId
   * Obter relatório financeiro
   */
  static async getFinancialReport(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;

      const report = await reportsService.getFinancialReport(eventId, userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/export/:type/:eventId
   * Exportar relatório em CSV
   */
  static async exportReport(
    req: Request<{ type: string; eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { type, eventId } = req.params;

      if (!['sales', 'checkin', 'financial'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de relatório inválido',
        });
      }

      const csv = await reportsService.exportCSV(type as 'sales' | 'checkin' | 'financial', eventId, userId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${eventId}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/:eventId/excel
   * Exportar relatorio completo em Excel (9 abas)
   */
  static async exportExcel(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;

      const data = await reportsDataService.getExcelReportData(eventId, userId);
      const builder = new ExcelReportBuilder(data);
      const buffer = await builder.toBuffer();

      const safeTitle = data.event.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const filename = `PulsePass_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
