import { Request, Response } from 'express';
import { TicketsService } from './tickets.service';
import { TransferTicketInput, ConfirmTransferInput, ValidateQRInput } from './tickets.validators';

/**
 * Controllers para o módulo de ingressos
 */

const ticketsService = new TicketsService();

/**
 * GET /tickets/mine
 * Obtém ingressos ativos do usuário autenticado
 */
export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const tickets = await ticketsService.getMyTickets(userId);

  res.json({
    success: true,
    data: tickets,
  });
};

/**
 * GET /tickets/:id
 * Obtém um ingresso específico
 */
export const getTicket = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const ticketId = req.params.id;

  const ticket = await ticketsService.getTicketById(ticketId, userId);

  res.json({
    success: true,
    data: ticket,
  });
};

/**
 * GET /tickets/:id/qr
 * Gera QR code TOTP para o ingresso
 */
export const getTicketQR = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const ticketId = req.params.id;

  const qrData = await ticketsService.generateTicketQR(ticketId, userId);

  res.json({
    success: true,
    data: qrData,
  });
};

/**
 * POST /tickets/:id/transfer
 * Inicia transferência de ingresso
 */
export const initiateTransfer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const ticketId = req.params.id;
  const data = req.body as TransferTicketInput;

  const transfer = await ticketsService.initiateTransfer(ticketId, userId, data);

  res.status(201).json({
    success: true,
    data: transfer,
    message: 'Transferência iniciada. Código OTP enviado por email.',
  });
};

/**
 * POST /tickets/transfers/:id/confirm
 * Confirma transferência de ingresso
 */
export const confirmTransfer = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const transferId = req.params.id;
  const data = req.body as ConfirmTransferInput;

  const ticket = await ticketsService.confirmTransfer(transferId, userId, data.otpCode);

  res.json({
    success: true,
    data: ticket,
    message: 'Transferência confirmada com sucesso.',
  });
};

/**
 * GET /tickets/history
 * Obtém histórico de ingressos do usuário
 */
export const getTicketHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const history = await ticketsService.getTicketHistory(userId);

  res.json({
    success: true,
    data: history,
  });
};

/**
 * POST /tickets/validate-qr
 * Valida ingresso no checkin (operador)
 */
export const validateQR = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as ValidateQRInput;

  const validation = await ticketsService.validateQR(data);

  res.json({
    success: validation.isValid,
    data: validation,
  });
};
