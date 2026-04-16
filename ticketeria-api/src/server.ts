import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSentry, Sentry } from './config/sentry';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { LiveService } from './modules/live/live.service';

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

  // Socket.IO middleware de autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token não fornecido'));
    }
    // TODO: Verificar JWT e associar user ao socket
    next();
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

    // Join room do usuário para notificações pessoais
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
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
