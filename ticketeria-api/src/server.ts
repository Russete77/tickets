import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSentry, Sentry } from './config/sentry';
import { createApp } from './app';
import { env } from './config/env';
import jwt from 'jsonwebtoken';
import { jwtKeys } from './config/jwt';
import { logger } from './shared/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { LiveService } from './modules/live/live.service';
import { subscribeToSocketBroadcasts } from './shared/socketBridge';

// Initialize Sentry at the very top
initSentry();

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // ============================
  // Socket.IO setup
  // ============================
  const io = new SocketIOServer(server, {
    cors: {
      origin: [env.FRONTEND_URL, env.ADMIN_URL, env.CHECKIN_URL],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.IO middleware de autenticacao (RS256)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token nao fornecido'));
    }

    try {
      const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as {
        userId: string;
        email: string;
        role: string;
      };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join room da home page para feed de vendas global
    socket.on('join:home', () => {
      socket.join('home');
      logger.debug(`Socket ${socket.id} joined home (global feed)`);
    });

    socket.on('leave:home', () => {
      socket.leave('home');
    });

    // Join room do evento para receber atualizações em tempo real
    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      logger.debug(`Socket ${socket.id} joined event:${eventId}`);
    });

    socket.on('leave:event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
    });

    // Join room do usuario para notificacoes pessoais (usa userId autenticado)
    socket.on('join:user', () => {
      if (socket.data.user?.userId) {
        socket.join(`user:${socket.data.user.userId}`);
      }
    });

    // Join producer room for capacity alerts and event management
    socket.on('join:producer', () => {
      if (socket.data.user?.role === 'producer' || socket.data.user?.role === 'admin') {
        socket.join(`producer:${socket.data.user.userId}`);
      }
    });

    // ============================
    // Heartbeat para viewer tracking
    // ============================
    socket.on('viewer:heartbeat', async ({ eventId }: { eventId: string }) => {
      try {
        await LiveService.recordOnlineViewer(eventId, socket.id);
        logger.debug(`Heartbeat recorded: ${socket.id} in event ${eventId}`);
      } catch (error) {
        logger.error(`Failed to record viewer heartbeat: ${error}`);
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Disponibiliza io para os módulos via app.locals
  app.set('io', io);

  // Bridge Redis pub/sub → Socket.IO for worker broadcasts
  subscribeToSocketBroadcasts(io);

  // ============================
  // Start server
  // ============================
  server.listen(env.PORT, () => {
    logger.info(`🚀 Ticketeria API rodando em ${env.API_BASE_URL}`);
    logger.info(`📡 WebSocket ativo na porta ${env.PORT}`);
    logger.info(`🌍 Ambiente: ${env.NODE_ENV}`);
  });

  // ============================
  // Graceful shutdown
  // ============================
  const shutdown = async (signal: string) => {
    logger.info(`${signal} recebido. Encerrando gracefully...`);

    server.close(async () => {
      logger.info('HTTP server fechado');

      await prisma.$disconnect();
      logger.info('Prisma desconectado');

      await redis.quit();
      logger.info('Redis desconectado');

      io.close();
      logger.info('Socket.IO fechado');

      process.exit(0);
    });

    // Force shutdown após 10s
    setTimeout(() => {
      logger.error('Timeout de graceful shutdown. Forçando encerramento.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'Falha ao iniciar o servidor');
  process.exit(1);
});
