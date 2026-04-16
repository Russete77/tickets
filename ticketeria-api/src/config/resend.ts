import { env } from './env';
import { logger } from '../shared/logger';

interface ResendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string;
  created_at: string;
  error?: string;
}

/**
 * Resend email client using native fetch
 * API: https://api.resend.com/emails
 */
export async function sendEmail(options: ResendEmailOptions): Promise<ResendResponse> {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured, skipping email send');
    return { id: 'mock', from: options.from || '', to: options.to, created_at: new Date().toISOString() };
  }

  const payload = {
    from: options.from || `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json() as { message?: string; errors?: unknown[] };
      const errorMessage = errorData.message || JSON.stringify(errorData);
      throw new Error(`Resend API error: ${response.status} ${response.statusText} - ${errorMessage}`);
    }

    const data = (await response.json()) as ResendResponse;

    logger.info(`Email sent successfully`, {
      id: data.id,
      to: options.to,
      subject: options.subject,
    });

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to send email: ${message}`, {
      to: options.to,
      subject: options.subject,
      error: message,
    });

    // Don't throw - let the app continue even if email fails
    return {
      id: 'failed',
      from: options.from || '',
      to: options.to,
      created_at: new Date().toISOString(),
      error: message,
    };
  }
}
