import { getFirestore } from '../firebase';
import { COLLECTIONS, type SymbolDoc } from './types';
import { docWithId, newId } from './helpers';

export const symbolsRepo = {
  async findById(id: string) {
    const snap = await getFirestore().collection(COLLECTIONS.symbols).doc(id).get();
    if (!snap.exists) return null;
    return docWithId(snap.id, snap.data() as SymbolDoc);
  },

  async findBySymbol(symbol: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.symbols)
      .where('symbol', '==', symbol.toUpperCase())
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as SymbolDoc);
  },

  async findManyActive() {
    const snap = await getFirestore()
      .collection(COLLECTIONS.symbols)
      .where('isActive', '==', true)
      .orderBy('symbol', 'asc')
      .get();
    return snap.docs.map((d) => docWithId(d.id, d.data() as SymbolDoc));
  },

  async countActive(): Promise<number> {
    const snap = await getFirestore()
      .collection(COLLECTIONS.symbols)
      .where('isActive', '==', true)
      .count()
      .get();
    return snap.data().count;
  },

  async upsert(data: {
    symbol: string;
    baseAsset: string;
    quoteAsset?: string;
    minQty?: number;
    tickSize?: number;
    contractSize?: number;
    isActive?: boolean;
  }) {
    const existing = await this.findBySymbol(data.symbol);
    const now = new Date();

    if (existing) {
      await getFirestore()
        .collection(COLLECTIONS.symbols)
        .doc(existing.id)
        .update({ isActive: data.isActive ?? true, updatedAt: now });
      return this.findById(existing.id);
    }

    const id = newId();
    const doc: SymbolDoc = {
      symbol: data.symbol.toUpperCase(),
      baseAsset: data.baseAsset,
      quoteAsset: data.quoteAsset ?? 'USDT',
      isActive: data.isActive ?? true,
      minQty: data.minQty ?? null,
      tickSize: data.tickSize ?? null,
      contractSize: data.contractSize ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await getFirestore().collection(COLLECTIONS.symbols).doc(id).set(doc);
    return { id, ...doc };
  },
};
