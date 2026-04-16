import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { PaymentsService } from './payments.service';

export class WebhookController {
  /**
   * POST /payments/webhook
   * Processa webhooks do Asaas
   *
   * Asaas envia o authToken configurado no header 'asaas-access-token'
   * Validamos comparando com env.ASAAS_WEBHOOK_SECRET
   *
   * Retorna 200 imediatamente e processa de forma assíncrona
   */
  static async handleAsaasWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validar token de acesso Asaas (header asaas-access-token)
    const asaasAccessToken = req.headers['asaas-access-token'] as string;

    if (!asaasAccessToken || asaasAccessToken !== env.ASAAS_WEBHOOK_SECRET) {
      // Log suspeito mas não erro - apenas ignorar
      console.warn('Tentativa de webhook com token inválido ou ausente');
      res.status(200).json({ received: true }); // Retornar 200 mesmo assim
      return;
    }

    // Extrair dados do webhook
    const { event, id, payment } = req.body;

    if (!event) {
      res.status(200).json({ received: true });
      return;
    }

    // Retornar 200 imediatamente (processamento assíncrono)
    res.status(200).json({ received: true });

    // Processar webhook de forma assíncrona sem bloquear a resposta
    setImmediate(async () => {
      try {
        await PaymentsService.processWebhook(event, req.body);
      } catch (error) {
        console.error('Erro ao processar webhook Asaas:', error);
        // Não relançar erro - apenas log
      }
    });
  }
}
