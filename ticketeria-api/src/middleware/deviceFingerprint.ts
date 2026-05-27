import { Request, Response, NextFunction } from 'express';

/**
 * Extrai o fingerprint enviado pelo cliente no header `X-Device-Fingerprint`
 * e o disponibiliza em `req.deviceFingerprint` + `req.ipAddress`.
 *
 * O frontend (web/mobile) deve calcular um hash determinístico a partir de
 * propriedades estáveis do dispositivo (canvas hash, screen size, user-agent,
 * timezone, audio context...) e injetar esse hash em todo request via interceptor.
 *
 * Este middleware é tolerante: se o header estiver ausente, o valor fica `undefined`.
 * Cabe a cada endpoint crítico (checkout, checkin, transferência) decidir se rejeita
 * a request quando o fingerprint não vier.
 */

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      deviceFingerprint?: string;
      ipAddress?: string;
    }
  }
}

const FINGERPRINT_HEADER = 'x-device-fingerprint';
const FINGERPRINT_MAX_LENGTH = 128;
const FINGERPRINT_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export function deviceFingerprint(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers[FINGERPRINT_HEADER];
  const fingerprint = Array.isArray(raw) ? raw[0] : raw;

  if (typeof fingerprint === 'string' && FINGERPRINT_REGEX.test(fingerprint.slice(0, FINGERPRINT_MAX_LENGTH))) {
    req.deviceFingerprint = fingerprint.slice(0, FINGERPRINT_MAX_LENGTH);
  }

  // Captura IP real respeitando proxies (X-Forwarded-For). Express já popula req.ip
  // quando `trust proxy` está habilitado; aqui mantemos o fallback explícito.
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    req.ipAddress = xff.split(',')[0]?.trim();
  } else {
    req.ipAddress = req.ip || req.socket.remoteAddress || undefined;
  }

  next();
}
