import { Request, Response, NextFunction } from 'express';
import { CertificatesService } from './certificates.service';
import {
  CreateCertificateInput,
  ListCertificatesInput,
  VerifyCertificateInput,
} from './certificates.validators';

/**
 * Controllers para o módulo de certificados
 */

/**
 * POST /certificates/:eventId
 * Emitir certificado para participante
 */
export class CertificatesController {
  static async issueCertificate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const eventId = req.params.eventId as string;
      const data = req.body as CreateCertificateInput;

      const certificate = await CertificatesService.issue(eventId, userId, data);

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Certificado emitido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /certificates/:eventId
   * Listar certificados do evento
   */
  static async listByEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const eventId = req.params.eventId as string;
      const { cursor, limit, direction } = req.query as unknown as ListCertificatesInput;

      const result = await CertificatesService.listByEvent(
        eventId,
        userId,
        {
          cursor,
          limit: limit ? parseInt(String(limit), 10) : 20,
          direction: direction as 'forward' | 'backward' | undefined,
        },
      );

      res.json({
        success: true,
        data: result.data,
        cursor: result.cursor,
        hasMore: result.hasMore,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /certificates/verify/:code
   * Verificar certificado por código (público, sem autenticação)
   */
  static async verifyCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;

      const certificate = await CertificatesService.verify(code);

      res.json({
        success: true,
        data: certificate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /certificates/:id
   * Obter certificado por ID
   */
  static async getCertificateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const certificate = await CertificatesService.getById(id);

      res.json({
        success: true,
        data: certificate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /certificates/:id/pdf
   * Gerar PDF do certificado
   */
  static async generatePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const result = await CertificatesService.generatePdf(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
