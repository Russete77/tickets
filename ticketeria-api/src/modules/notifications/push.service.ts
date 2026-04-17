import { expo } from '../../config/expo';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from '../../config/database';
import { pushQueue } from '../../jobs/queue';
import { logger } from '../../shared/logger';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class PushService {
  /**
   * Enqueue a push notification for a single user
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await pushQueue.add('send-push', { userId, title, body, data });
  }

  /**
   * Enqueue push notifications for multiple users
   */
  async sendBulkPush(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const jobs = userIds.map((userId) => ({
      name: 'send-push',
      data: { userId, title, body, data },
    }));
    await pushQueue.addBulk(jobs);
  }

  /**
   * Actually deliver a push notification (called by worker)
   */
  async deliver(payload: PushPayload): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, expoPushToken: true },
    });

    if (!user?.expoPushToken) {
      logger.debug(`No push token for user ${payload.userId}, skipping`);
      return;
    }

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      logger.warn(`Invalid push token for user ${payload.userId}: ${user.expoPushToken}`);
      return;
    }

    const message: ExpoPushMessage = {
      to: user.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    };

    try {
      const tickets = await expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket.status === 'error') {
        logger.error(`Push delivery error for user ${payload.userId}: ${ticket.message}`);

        // If token is invalid, remove it
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.user.update({
            where: { id: payload.userId },
            data: { expoPushToken: null },
          });
          logger.info(`Removed invalid push token for user ${payload.userId}`);
        }
      }

      // Save to Notification table
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: 'push',
          channel: 'push',
          title: payload.title,
          body: payload.body,
          metadata: JSON.parse(JSON.stringify(payload.data || {})),
        },
      });
    } catch (error) {
      logger.error({ error }, `Failed to send push to user ${payload.userId}`);
      throw error; // Let BullMQ retry
    }
  }
}

export const pushService = new PushService();
