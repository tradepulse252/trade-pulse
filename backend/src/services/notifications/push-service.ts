import { getFirebaseApp, initFirebase } from '../../lib/firebase';
import { db } from '../../lib/db';
import { tryConnectRedis } from '../../lib/redis';

export async function initPushNotifications(): Promise<void> {
  await initFirebase();
  if (getFirebaseApp()) {
    console.log('[push] Firebase messaging ready');
  } else {
    console.warn('[push] Firebase not configured — push notifications disabled');
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!getFirebaseApp()) return false;

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
        await db.alerts.markPushedByTitle(title);
      }
    } catch {
      // ignore malformed messages
    }
  });
}
