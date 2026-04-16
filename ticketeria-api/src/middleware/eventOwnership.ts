import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError } from '../shared/errors';

/**
 * Middleware que verifica se o usuário autenticado (produtor) é dono do evento.
 * Extrai o eventId de req.params.eventId ou req.body.eventId.
 * Usuários admin ignoram essa verificação.
 */
export function requireEventOwnership(req: Request, _res: Response, next: NextFunction): void {
  const eventId = req.params.eventId || req.body?.eventId;

  if (!eventId) {
    throw new NotFoundError('eventId nao fornecido');
  }

  if (!req.user) {
    throw new ForbiddenError('Nao autenticado');
  }

  // Admins ignoram a verificacao de propriedade
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Verifica propriedade de forma assíncrona
  prisma.event.findUnique({
    where: { id: eventId },
    select: { producerId: true },
  }).then((event) => {
    if (!event) {
      throw new NotFoundError('Evento nao encontrado');
    }

    if (event.producerId !== req.user!.userId) {
      throw new ForbiddenError('Voce nao tem permissao para acessar este evento');
    }

    next();
  }).catch(next);
}
