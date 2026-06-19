import { prisma } from '../../lib/prisma';
import { tryConnectRedis } from '../../lib/redis';

let firebaseApp: import('firebase-admin').app.App | null = null;

export async function initPushNotifications(): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[push] Firebase not configured — push notifications disabled');
    return;
  }

  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    console.log('[push] Firebase initialized');
  } catch (error) {
    console.warn('[push] Firebase init failed:', (error as Error).message);
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!firebaseApp) return false;

  try {
    const admin = await import('firebase-admin');
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      webpush: { notification: { title, body } },
    });
    return true;
  } catch (error) {
    console.error('[push] Send failed:', (error as Error).message);
    return false;
  }
}

export async function processPushQueue(): Promise<void> {
  const connected = await tryConnectRedis();
  if (!connected) return;

  const { getRedis } = await import('../../lib/redis');
  const redis = getRedis();
  if (!redis) return;

  const subscriber = redis.duplicate();
  await subscriber.subscribe('push-notifications');

  subscriber.on('message', async (_channel: string, message: string) => {
    try {
      const { token, title, body, data } = JSON.parse(message) as {
        token: string;
        title: string;
        body: string;
        data?: Record<string, string>;
      };
      const sent = await sendPushNotification(token, title, body, data);
      if (sent) {
        await prisma.alert.updateMany({
          where: { title, isPushed: false },
          data: { isPushed: true },
        });
      }
    } catch {
      // ignore malformed messages
    }
  });
}
