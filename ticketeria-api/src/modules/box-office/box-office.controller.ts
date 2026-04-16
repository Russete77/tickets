import { Request, Response, NextFunction } from 'express';
import { BoxOfficeService } from './box-office.service';
import { OpenSessionInput, CloseSessionInput, SellTicketInput } from './box-office.validators';

/**
 * Controllers para o módulo de caixa (box-office)
 */

const boxOfficeService = new BoxOfficeService();

/**
 * POST /box-office/:eventId/open
 * Abre uma nova sessão de caixa para um evento
 */
export const openSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user!.userId;
    const data = req.body as OpenSessionInput;

    const session = await boxOfficeService.openSession(eventId, userId, data);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /box-office/:eventId/close
 * Fecha uma sessão de caixa
 */
export const closeSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user!.userId;
    const data = req.body as CloseSessionInput;

    const session = await boxOfficeService.closeSession(sessionId, userId, data);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /box-office/:eventId/sell
 * Vende ingresso na porta
 */
export const sellTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user!.userId;
    const data = req.body as SellTicketInput;

    const tickets = await boxOfficeService.sellTicket(eventId, userId, data);

    res.status(201).json({
      success: true,
      data: {
        ticketCount: tickets.length,
        tickets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /box-office/:eventId/report
 * Obtém relatório de vendas do evento
 */
export const getReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const eventId = req.params.eventId;

    const report = await boxOfficeService.getReport(eventId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /box-office/:eventId/print-ticket/:ticketId
 * Gera dados de impressão para um ingresso
 */
export const printTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ticketId = req.params.ticketId;

    const printData = await boxOfficeService.printTicket(ticketId);

    res.json({
      success: true,
      data: printData,
    });
  } catch (error) {
    next(error);
  }
};
