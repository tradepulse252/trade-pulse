import type { Query } from 'firebase-admin/firestore';
import { getFirestore } from '../firebase';
import { COLLECTIONS, type WatchlistItemDoc } from './types';
import { docWithId, watchlistDocId } from './helpers';

export const watchlistRepo = {
  async findByUserId(userId: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.watchlistItems)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => docWithId(d.id, d.data() as WatchlistItemDoc));
  },

  async upsert(userId: string, symbolId: string, notes?: string | null) {
    const id = watchlistDocId(userId, symbolId);
    const ref = getFirestore().collection(COLLECTIONS.watchlistItems).doc(id);
    const existing = await ref.get();

    if (existing.exists) {
      await ref.update({ notes: notes ?? null });
      return docWithId(id, (await ref.get()).data() as WatchlistItemDoc);
    }

    const doc: WatchlistItemDoc = {
      userId,
      symbolId,
      notes: notes ?? null,
      createdAt: new Date(),
    };
    await ref.set(doc);
    return { id, ...doc };
  },

  async deleteByUserAndSymbol(userId: string, symbolId: string) {
    const id = watchlistDocId(userId, symbolId);
    await getFirestore().collection(COLLECTIONS.watchlistItems).doc(id).delete();
  },
};
