import type { Query } from 'firebase-admin/firestore';
import { getFirestore } from '../firebase';
import { COLLECTIONS, type SignalDoc, SignalType } from './types';
import { docWithId, newId } from './helpers';

export const signalsRepo = {
  async findActiveBySymbolId(symbolId: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.signals)
      .where('symbolId', '==', symbolId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as SignalDoc);
  },

  async findActiveBySymbolIdOrdered(symbolId: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.signals)
      .where('symbolId', '==', symbolId)
      .where('isActive', '==', true)
      .orderBy('opportunityScore', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as SignalDoc);
  },

  async create(data: Omit<SignalDoc, 'detectedAt' | 'updatedAt' | 'rank'> & { rank?: number | null }) {
    const now = new Date();
    const id = newId();
    const doc: SignalDoc = {
      ...data,
      rank: data.rank ?? null,
      detectedAt: now,
      updatedAt: now,
    };
    await getFirestore().collection(COLLECTIONS.signals).doc(id).set(doc);
    return { id, ...doc };
  },

  async update(id: string, data: Partial<SignalDoc>) {
    await getFirestore()
      .collection(COLLECTIONS.signals)
      .doc(id)
      .update({ ...data, updatedAt: new Date() });
    const snap = await getFirestore().collection(COLLECTIONS.signals).doc(id).get();
    return docWithId(snap.id, snap.data() as SignalDoc);
  },

  async findMany(filters: {
    isActive?: boolean;
    signalType?: SignalType;
    minScore?: number;
    minOi?: number;
    minVolume?: number;
    fundingRateMin?: number;
    fundingRateMax?: number;
    limit?: number;
  }) {
    let query: Query = getFirestore().collection(COLLECTIONS.signals);

    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }
    if (filters.signalType) {
      query = query.where('signalType', '==', filters.signalType);
    }
    if (filters.minScore !== undefined) {
      query = query.where('opportunityScore', '>=', filters.minScore);
    }

    query = query.orderBy('opportunityScore', 'desc').limit(filters.limit ?? 50);

    const snap = await query.get();
    let results = snap.docs.map((d) => docWithId(d.id, d.data() as SignalDoc));

    if (filters.minOi !== undefined) {
      results = results.filter((s) => s.openInterest >= filters.minOi!);
    }
    if (filters.minVolume !== undefined) {
      results = results.filter((s) => s.volumeUsdt >= filters.minVolume!);
    }
    if (filters.fundingRateMin !== undefined) {
      results = results.filter((s) => s.fundingRate >= filters.fundingRateMin!);
    }
    if (filters.fundingRateMax !== undefined) {
      results = results.filter((s) => s.fundingRate <= filters.fundingRateMax!);
    }

    return results;
  },
};
