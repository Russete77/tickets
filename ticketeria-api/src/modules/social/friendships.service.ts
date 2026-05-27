import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors';

export class FriendshipsService {
  static async request(requesterId: string, addresseeIdentifier: string) {
    let addressee = await prisma.user.findUnique({
      where: { email: addresseeIdentifier.toLowerCase() },
      select: { id: true },
    });
    if (!addressee) {
      addressee = await prisma.user.findUnique({
        where: { id: addresseeIdentifier },
        select: { id: true },
      });
    }
    if (!addressee) throw new NotFoundError('Usuário não encontrado');
    if (addressee.id === requesterId) throw new BadRequestError('Você não pode adicionar você mesmo');

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId },
        ],
      },
    });
    if (existing) {
      if (existing.status === 'blocked') throw new ForbiddenError('Não é possível adicionar este usuário');
      if (existing.status === 'accepted') return existing;
      if (existing.requesterId === addressee.id && existing.status === 'pending') {
        return prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'accepted' },
        });
      }
      throw new ConflictError('Solicitação já enviada');
    }

    return prisma.friendship.create({
      data: { requesterId, addresseeId: addressee.id, status: 'pending' },
    });
  }

  static async accept(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) throw new NotFoundError('Solicitação não encontrada');
    if (f.addresseeId !== userId) throw new ForbiddenError('Apenas o destinatário pode aceitar');
    if (f.status !== 'pending') throw new BadRequestError('Solicitação já processada');
    return prisma.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } });
  }

  static async reject(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) throw new NotFoundError('Solicitação não encontrada');
    if (f.addresseeId !== userId && f.requesterId !== userId) throw new ForbiddenError();
    return prisma.friendship.delete({ where: { id: f.id } });
  }

  static async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestError('Você não pode se bloquear');
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });
    if (existing) {
      return prisma.friendship.update({
        where: { id: existing.id },
        data: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
      });
    }
    return prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
    });
  }

  static async listMine(userId: string, status: 'accepted' | 'pending' = 'accepted') {
    const filter = status === 'pending'
      ? { addresseeId: userId, status: 'pending' as const }
      : {
          OR: [
            { requesterId: userId, status: 'accepted' as const },
            { addresseeId: userId, status: 'accepted' as const },
          ],
        };
    const rows = await prisma.friendship.findMany({
      where: filter,
      include: {
        requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
        addressee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      friend: r.requesterId === userId ? r.addressee : r.requester,
      createdAt: r.createdAt,
    }));
  }

  static async friendsPresentAtEvent(userId: string, eventId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = new Set<string>();
    for (const f of friendships) {
      friendIds.add(f.requesterId === userId ? f.addresseeId : f.requesterId);
    }
    if (friendIds.size === 0) return [];

    const checkins = await prisma.checkinLog.findMany({
      where: {
        eventId,
        result: { in: ['valid', 'offline_valid'] },
        ticket: { holderId: { in: Array.from(friendIds) } },
      },
      select: {
        scannedAt: true,
        ticket: {
          select: {
            holder: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
      distinct: ['ticketId'],
    });

    const seen = new Set<string>();
    const out: Array<{ id: string; name: string; avatarUrl: string | null; checkedInAt: Date }> = [];
    for (const c of checkins) {
      const h = c.ticket.holder;
      if (!h || seen.has(h.id)) continue;
      seen.add(h.id);
      out.push({ id: h.id, name: h.name, avatarUrl: h.avatarUrl, checkedInAt: c.scannedAt });
    }
    return out;
  }
}
