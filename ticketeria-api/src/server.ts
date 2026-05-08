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

    // Cashless admin (sub-projeto 1) — rooms para sync de catálogo e estoque
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    socket.on('pos:join', ({ posId }: { posId?: string }) => {
      if (typeof posId === 'string' && UUID_REGEX.test(posId)) {
        socket.join(`pos:${posId}`);
        logger.debug({ socketId: socket.id, posId }, 'socket joined pos room');
      }
    });

    socket.on('org:join', ({ organizationId }: { organizationId?: string }) => {
      if (typeof organizationId === 'string' && UUID_REGEX.test(organizationId)) {
        socket.join(`org:${organizationId}`);
        logger.debug({ socketId: socket.id, organizationId }, 'socket joined org room');
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
  // Sequência segura para zero perda de dados em deploys:
  //   1. Para de aceitar novas conexões HTTP (server.close).
  //   2. Avisa clientes Socket.IO antes de cortar (graceful disconnect).
  //   3. Espera requests em vôo terminarem (até 20s).
  //   4. Fecha Prisma + Redis.
  //   5. Mata o processo. Em K8s, SIGKILL chega em 30s — temos folga.
  // ============================
  let shuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = 25_000;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} recebido. Encerrando gracefully...`);

    // Timer fail-safe: se algo travar, força saída
    const forceExitTimer = setTimeout(() => {
      logger.error('Timeout de graceful shutdown. Forçando encerramento.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    try {
      // 1. Stop accepting new connections (existing requests terminam)
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server fechado (sem novas conexões)');

      // 2. Avisar Socket.IO clients e fechar com timeout
      io.emit('server:shutdown', { reason: 'maintenance' });
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
        // BullMQ não está no servidor da API, está no worker-runner — aqui só Socket.IO
        setTimeout(resolve, 5_000); // garantia de não travar
      });
      logger.info('Socket.IO fechado');

      // 3. Fechar conexões persistentes
      await prisma.$disconnect();
      logger.info('Prisma desconectado');

      await redis.quit();
      logger.info('Redis desconectado');

      clearTimeout(forceExitTimer);
      logger.info('Shutdown completo. Saindo limpo.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Erro no graceful shutdown');
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException — iniciando shutdown');
    void shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection');
  });
}

bootstrap().catch((err) => {
  logger.fatal(err, 'Falha ao iniciar o servidor');
  process.exit(1);
});
