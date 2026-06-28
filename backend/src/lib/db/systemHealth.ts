import { getFirestore } from '../firebase';
import { COLLECTIONS, type SystemHealthDoc } from './types';
import { docWithId, newId } from './helpers';

export const systemHealthRepo = {
  async create(data: Omit<SystemHealthDoc, 'recordedAt' | 'errorCount'>) {
    const id = newId();
    const doc: SystemHealthDoc = {
      ...data,
      errorCount: 0,
      recordedAt: new Date(),
    };
    await getFirestore().collection(COLLECTIONS.systemHealth).doc(id).set(doc);
    return { id, ...doc };
  },

  async findLatest() {
    const snap = await getFirestore()
      .collection(COLLECTIONS.systemHealth)
      .orderBy('recordedAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as SystemHealthDoc);
  },
};
