import { getFirestore } from '../firebase';
import { COLLECTIONS, type AlertSettingDoc } from './types';
import { DEFAULT_ALERT_SETTINGS, docWithId } from './helpers';

export const alertSettingsRepo = {
  async findByUserId(userId: string) {
    const snap = await getFirestore().collection(COLLECTIONS.alertSettings).doc(userId).get();
    if (!snap.exists) return null;
    return docWithId(snap.id, snap.data() as AlertSettingDoc);
  },

  async createForUser(userId: string) {
    const doc: AlertSettingDoc = {
      userId,
      ...DEFAULT_ALERT_SETTINGS,
    };
    await getFirestore().collection(COLLECTIONS.alertSettings).doc(userId).set(doc);
    return { id: userId, ...doc };
  },

  async upsert(userId: string, data: Partial<AlertSettingDoc>) {
    const ref = getFirestore().collection(COLLECTIONS.alertSettings).doc(userId);
    const existing = await ref.get();
    if (existing.exists) {
      await ref.update(data);
    } else {
      await ref.set({
        userId,
        ...DEFAULT_ALERT_SETTINGS,
        ...data,
      });
    }
    return this.findByUserId(userId);
  },
};
