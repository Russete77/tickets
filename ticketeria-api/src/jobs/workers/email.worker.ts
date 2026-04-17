import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { sendEmail } from '../../config/resend';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// Simple template renderer
function renderTemplate(template: string, data: Record<string, unknown>): string {
  const templates: Record<string, (d: Record<string, unknown>) => string> = {
    welcome: (d) => `
      <h1>Bem-vindo ao Ticketeria, ${d.name}!</h1>
      <p>Sua conta foi criada com sucesso.</p>
      <p>Email: ${d.email}</p>
    `,
    order_confirmed: (d) => `
      <h1>Pedido Confirmado</h1>
      <p>Seu pedido foi confirmado com sucesso!</p>
      <p>ID do Pedido: ${d.orderId}</p>
      <p>Total: R$ ${((d.totalCents as number) / 100).toFixed(2)}</p>
      <p>Ingressos: ${d.ticketCount}</p>
      ${(d.tickets as Array<{ holderName: string; holderEmail: string }>)?.map((t) => `<p>- ${t.holderName} (${t.holderEmail})</p>`).join('')}
    `,
    ticket_issued: (d) => `
      <h1>Seu Ingresso</h1>
      <p>Seu ingresso para ${d.eventTitle} foi emitido!</p>
      <p>ID: ${d.ticketId}</p>
      <p>Titular: ${d.holderName}</p>
      <p>Hash: ${d.ticketHash}</p>
    `,
    transfer_request: (d) => `
      <h1>Você Recebeu um Ingresso!</h1>
      <p>Um ingresso foi transferido para você.</p>
      <p>Código de Confirmação (OTP): <strong>${d.otpCode}</strong></p>
      <p>Válido por: ${d.expiresIn}</p>
    `,
    transfer_completed_from: (d) => `
      <h1>Ingresso Transferido</h1>
      <p>Seu ingresso foi transferido com sucesso para ${d.toUserName}.</p>
      <p>Email: ${d.toUserEmail}</p>
      <p>ID do Ingresso: ${d.ticketId}</p>
    `,
    transfer_completed_to: (d) => `
      <h1>Você Recebeu um Ingresso!</h1>
      <p>O ingresso foi transferido com sucesso de ${d.fromUserName}.</p>
      <p>ID do Ingresso: ${d.ticketId}</p>
      <p>Hash: ${d.ticketHash}</p>
    `,
    event_reminder: (d) => `
      <h1>Lembrete: ${d.eventTitle}</h1>
      <p>Olá ${d.holderName},</p>
      <p>Seu evento está chegando!</p>
      <p>Data: ${d.startsAt}</p>
      <p>ID do Ingresso: ${d.ticketId}</p>
    `,
    review_request: (d) => `
      <h1>Avalie Seu Evento</h1>
      <p>Olá ${d.holderName},</p>
      <p>Adoraríamos saber sua opinião sobre ${d.eventTitle}!</p>
      <p>ID do Ingresso: ${d.ticketId}</p>
    `,
    refund_processed: (d) => `
      <h1>Reembolso Processado</h1>
      <p>Seu reembolso foi processado com sucesso!</p>
      <p>Pedido ID: ${d.orderId}</p>
      <p>Valor: R$ ${((d.refundAmount as number) / 100).toFixed(2)}</p>
      <p>Status: ${d.status}</p>
    `,
    password_reset: (d) => `
      <h1>Redefina Sua Senha</h1>
      <p>Olá ${d.name},</p>
      <p><a href="${d.resetLink}">Clique aqui para redefinir sua senha</a></p>
      <p>Válido por: ${d.expiresIn}</p>
    `,
  };

  const renderer = templates[template];
  if (!renderer) {
    logger.warn(`Unknown email template: ${template}`);
    return `<p>Email template not found: ${template}</p>`;
  }

  return renderer(data);
}

export const emailWorker = new Worker<EmailJobData>(
  'send-email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, template, data } = job.data;

    logger.info(`📧 Enviando email: ${template} para ${to} - ${subject}`);

    const html = renderTemplate(template, data);
    const result = await sendEmail({
      to,
      subject,
      html,
    });

    logger.info({ emailId: result.id }, `✅ Email enviado: ${template} para ${to}`);
    return { sent: true, to, template, emailId: result.id };
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000, // 100 emails/segundo (limite Resend)
    },
  },
);

emailWorker.on('failed', (job, err) => {
  logger.error(`❌ Email falhou: ${job?.data.template} para ${job?.data.to} - ${err.message}`);
});
