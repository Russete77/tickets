import { User, Order, Ticket, TicketTransfer } from '../../generated/prisma/client';
import { sendEmail } from '../../config/resend';
import { logger } from '../../shared/logger';

interface EmailContent {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

/**
 * Serviço de envio de emails
 * Integração com Resend API
 */
export class EmailService {
  /**
   * Renderiza template simples em HTML
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, (data: Record<string, any>) => string> = {
      welcome: (d) => `
        <h1>Bem-vindo ao Ticketeria, ${d.name}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Email: ${d.email}</p>
      `,
      order_confirmed: (d) => `
        <h1>Pedido Confirmado</h1>
        <p>Seu pedido foi confirmado com sucesso!</p>
        <p>ID do Pedido: ${d.orderId}</p>
        <p>Total: R$ ${(d.totalCents / 100).toFixed(2)}</p>
        <p>Ingressos: ${d.ticketCount}</p>
        ${d.tickets?.map((t: { holderName: string; holderEmail: string }) => `<p>- ${t.holderName} (${t.holderEmail})</p>`).join('')}
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
        <p>Valor: R$ ${(d.refundAmount / 100).toFixed(2)}</p>
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

  /**
   * Log de email para fins de desenvolvimento
   */
  private logEmail(content: EmailContent): void {
    logger.debug({
      to: content.to,
      subject: content.subject,
      template: content.template,
      timestamp: new Date().toISOString(),
    }, '[EMAIL]');
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcome(user: User): Promise<void> {
    const content: EmailContent = {
      to: user.email,
      subject: 'Bem-vindo ao Ticketeria!',
      template: 'welcome',
      data: {
        name: user.name,
        email: user.email,
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email de confirmação de pedido
   */
  async sendOrderConfirmed(
    order: Order & { user?: User },
    tickets: Ticket[],
  ): Promise<void> {
    const user = order.user || { email: '', name: '' };

    const content: EmailContent = {
      to: user.email,
      subject: `Pedido confirmado - ${order.id}`,
      template: 'order_confirmed',
      data: {
        orderId: order.id,
        totalCents: order.totalCents,
        ticketCount: tickets.length,
        tickets: tickets.map((t) => ({
          id: t.id,
          holderName: t.holderName,
          holderEmail: t.holderEmail,
        })),
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email com ingresso emitido
   */
  async sendTicketIssued(ticket: Ticket & { event?: { title: string } }): Promise<void> {
    const content: EmailContent = {
      to: ticket.holderEmail,
      subject: `Seu ingresso para ${ticket.event?.title || 'evento'}`,
      template: 'ticket_issued',
      data: {
        ticketId: ticket.id,
        ticketHash: ticket.ticketHash,
        holderName: ticket.holderName,
        eventTitle: ticket.event?.title,
        priceCents: ticket.priceCents,
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email de solicitação de transferência
   */
  async sendTransferRequest(
    transfer: TicketTransfer,
    otpCode: string,
  ): Promise<void> {
    const content: EmailContent = {
      to: '', // O email do destinatário deveria vir com a transferência
      subject: 'Você recebeu um ingresso!',
      template: 'transfer_request',
      data: {
        transferId: transfer.id,
        otpCode,
        expiresIn: '24 horas',
      },
    };

    this.logEmail(content);
    if (content.to) {
      const html = this.renderTemplate(content.template, content.data);
      await sendEmail({
        to: content.to,
        subject: content.subject,
        html,
      });
    }
  }

  /**
   * Envia email de transferência completada
   */
  async sendTransferCompleted(
    ticket: Ticket,
    fromUser: User,
    toUser: User,
  ): Promise<void> {
    // Email para o remetente
    const fromContent: EmailContent = {
      to: fromUser.email,
      subject: 'Ingresso transferido com sucesso',
      template: 'transfer_completed_from',
      data: {
        ticketId: ticket.id,
        toUserName: toUser.name,
        toUserEmail: toUser.email,
      },
    };

    // Email para o destinatário
    const toContent: EmailContent = {
      to: toUser.email,
      subject: 'Você recebeu um ingresso transferido!',
      template: 'transfer_completed_to',
      data: {
        ticketId: ticket.id,
        fromUserName: fromUser.name,
        ticketHash: ticket.ticketHash,
      },
    };

    this.logEmail(fromContent);
    this.logEmail(toContent);

    const fromHtml = this.renderTemplate(fromContent.template, fromContent.data);
    const toHtml = this.renderTemplate(toContent.template, toContent.data);

    await Promise.all([
      sendEmail({
        to: fromContent.to,
        subject: fromContent.subject,
        html: fromHtml,
      }),
      sendEmail({
        to: toContent.to,
        subject: toContent.subject,
        html: toHtml,
      }),
    ]);
  }

  /**
   * Envia email de lembrete do evento
   */
  async sendEventReminder(ticket: Ticket & { event?: { title: string; startsAt: Date } }): Promise<void> {
    const content: EmailContent = {
      to: ticket.holderEmail,
      subject: `Lembrete: ${ticket.event?.title || 'seu evento'} está chegando!`,
      template: 'event_reminder',
      data: {
        ticketId: ticket.id,
        eventTitle: ticket.event?.title,
        startsAt: ticket.event?.startsAt,
        holderName: ticket.holderName,
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email de solicitação de avaliação
   */
  async sendReviewRequest(ticket: Ticket & { event?: { title: string } }): Promise<void> {
    const content: EmailContent = {
      to: ticket.holderEmail,
      subject: `Avalie seu evento: ${ticket.event?.title || 'evento'}`,
      template: 'review_request',
      data: {
        ticketId: ticket.id,
        eventTitle: ticket.event?.title,
        holderName: ticket.holderName,
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email de reembolso processado
   */
  async sendRefundProcessed(order: Order & { user?: User }): Promise<void> {
    const user = order.user || { email: '', name: '' };

    const content: EmailContent = {
      to: user.email,
      subject: 'Reembolso processado',
      template: 'refund_processed',
      data: {
        orderId: order.id,
        refundAmount: order.totalCents,
        status: 'processado',
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }

  /**
   * Envia email de reset de senha
   */
  async sendPasswordReset(user: User, resetToken: string): Promise<void> {
    const resetLink = `https://ticketeria.com/reset-password?token=${resetToken}`;

    const content: EmailContent = {
      to: user.email,
      subject: 'Redefina sua senha',
      template: 'password_reset',
      data: {
        name: user.name,
        resetLink,
        expiresIn: '24 horas',
      },
    };

    this.logEmail(content);
    const html = this.renderTemplate(content.template, content.data);
    await sendEmail({
      to: content.to,
      subject: content.subject,
      html,
    });
  }
}

export const emailService = new EmailService();
