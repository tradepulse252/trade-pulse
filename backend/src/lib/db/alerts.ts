import type { Query } from 'firebase-admin/firestore';
import { getFirestore } from '../firebase';
import { COLLECTIONS, type AlertDoc, AlertType } from './types';
import { docWithId, newId } from './helpers';

export const alertsRepo = {
  async create(data: {
    userId: string;
    symbolId?: string | null;
    alertType: AlertType;
    title: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const id = newId();
    const doc: AlertDoc = {
      userId: data.userId,
      symbolId: data.symbolId ?? null,
      alertType: data.alertType,
      title: data.title,
      message: data.message,
      metadata: data.metadata ?? null,
      isRead: false,
      isPushed: false,
      triggeredAt: new Date(),
    };
    await getFirestore().collection(COLLECTIONS.alerts).doc(id).set(doc);
    return { id, ...doc };
  },

  async findByUserId(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    let query: Query = getFirestore()
      .collection(COLLECTIONS.alerts)
      .where('userId', '==', userId);

    if (options?.unreadOnly) {
      query = query.where('isRead', '==', false);
    }

    query = query.orderBy('triggeredAt', 'desc').limit(options?.limit ?? 100);

    const snap = await query.get();
    return snap.docs.map((d) => docWithId(d.id, d.data() as AlertDoc));
  },

  async markRead(id: string, userId: string) {
    const ref = getFirestore().collection(COLLECTIONS.alerts).doc(id);
    const snap = await ref.get();
    if (!snap.exists || (snap.data() as AlertDoc).userId !== userId) return;
    await ref.update({ isRead: true });
  },

  async markAllRead(userId: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.alerts)
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    const batch = getFirestore().batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { isRead: true }));
    if (!snap.empty) await batch.commit();
  },

  async markPushedByTitle(title: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.alerts)
      .where('title', '==', title)
      .where('isPushed', '==', false)
      .get();

    const batch = getFirestore().batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { isPushed: true }));
    if (!snap.empty) await batch.commit();
  },

  async countSince(since: Date): Promise<number> {
    const snap = await getFirestore()
      .collection(COLLECTIONS.alerts)
      .where('triggeredAt', '>=', since)
      .count()
      .get();
    return snap.data().count;
  },
};
