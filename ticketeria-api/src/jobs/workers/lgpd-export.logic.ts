import JSZip from 'jszip';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { logAudit, AuditActions } from '../../shared/audit';
import { uploadObject } from '../../shared/storage/r2';
import { LgpdService } from '../../modules/lgpd/lgpd.service';
import { emailService } from '../../modules/notifications/email.service';

export interface LgpdExportInput {
  userId: string;
}

/**
 * Gera o ZIP de export LGPD, sobe no R2 e dispara email com o link.
 * Função pura de orquestração — testável sem instanciar BullMQ.
 */
export async function processLgpdExport(
  data: LgpdExportInput,
): Promise<{ exported: boolean; key?: string }> {
  const { userId } = data;

  const dump = await LgpdService.collectUserData(userId);

  const zip = new JSZip();
  zip.file('profile.json', JSON.stringify(dump.profile, null, 2));
  zip.file('tickets.json', JSON.stringify(dump.tickets, null, 2));
  zip.file('orders.json', JSON.stringify(dump.orders, null, 2));
  zip.file('transactions.json', JSON.stringify(dump.transactions, null, 2));
  zip.file('audit-trail.json', JSON.stringify(dump.auditTrail, null, 2));
  zip.file(
    'README.txt',
    [
      'Exportação de dados pessoais — Lei Geral de Proteção de Dados (LGPD).',
      `Gerado em: ${new Date().toISOString()}`,
      'Este pacote contém todos os dados pessoais associados à sua conta.',
      'Link de download válido por 24h.',
    ].join('\n'),
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  const key = `lgpd-exports/${userId}/${Date.now()}.zip`;
  const url = await uploadObject(key, buffer, 'application/zip');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user) {
    await emailService
      .sendLgpdExport(user.email, user.name, url)
      .catch((err) => logger.error({ err, userId }, 'Falha ao enviar email de export LGPD'));
  }

  await logAudit({
    actorId: userId,
    action: AuditActions.LGPD_DATA_EXPORT_COMPLETED,
    entityType: 'user',
    entityId: userId,
    metadata: { key },
  });

  logger.info({ userId, key }, 'LGPD: export concluído');

  return { exported: true, key };
}
