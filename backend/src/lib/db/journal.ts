import { getFirestore } from '../firebase';
import { COLLECTIONS, type JournalEntryDoc } from './types';
import { docWithId, newId } from './helpers';

export interface JournalFilters {
  direction?: string;
  coin?: string;
  result?: string;
  fromDate?: Date;
  toDate?: Date;
}

function applyFilters(entries: (JournalEntryDoc & { id: string })[], filters?: JournalFilters) {
  if (!filters) return entries;

  let result = entries;

  if (filters.direction) {
    result = result.filter((e) => e.direction === filters.direction);
  }
  if (filters.coin) {
    const coin = filters.coin.toUpperCase();
    result = result.filter((e) => e.coin.toUpperCase().includes(coin));
  }
  if (filters.result) {
    result = result.filter((e) => e.tradeResult === filters.result);
  }
  if (filters.fromDate) {
    result = result.filter((e) => e.tradeDate >= filters.fromDate!);
  }
  if (filters.toDate) {
    const end = new Date(filters.toDate);
    end.setHours(23, 59, 59, 999);
    result = result.filter((e) => e.tradeDate <= end);
  }

  return result;
}

export const journalRepo = {
  async findByUserId(userId: string, filters?: JournalFilters) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.journalEntries)
      .where('userId', '==', userId)
      .orderBy('tradeDate', 'desc')
      .get();

    const entries = snap.docs.map((d) => docWithId(d.id, d.data() as JournalEntryDoc));
    return applyFilters(entries, filters);
  },

  async findById(userId: string, id: string) {
    const ref = getFirestore().collection(COLLECTIONS.journalEntries).doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.userId !== userId) return null;
    return docWithId(doc.id, doc.data() as JournalEntryDoc);
  },

  async create(userId: string, data: Omit<JournalEntryDoc, 'userId' | 'createdAt' | 'updatedAt'>) {
    const id = newId();
    const now = new Date();
    const entry: JournalEntryDoc = {
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await getFirestore().collection(COLLECTIONS.journalEntries).doc(id).set(entry);
    return { id, ...entry };
  },

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<JournalEntryDoc, 'userId' | 'createdAt' | 'updatedAt'>>
  ) {
    const ref = getFirestore().collection(COLLECTIONS.journalEntries).doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.userId !== userId) return null;

    await ref.update({ ...data, updatedAt: new Date() });
    return docWithId(id, (await ref.get()).data() as JournalEntryDoc);
  },

  async delete(userId: string, id: string) {
    const ref = getFirestore().collection(COLLECTIONS.journalEntries).doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.userId !== userId) return false;
    await ref.delete();
    return true;
  },
};
