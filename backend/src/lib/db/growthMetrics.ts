import { getFirestore } from '../firebase';
import { COLLECTIONS, type GrowthMetricDoc, Timeframe } from './types';
import { docWithId, growthMetricDocId } from './helpers';

export const growthMetricsRepo = {
  async upsert(data: {
    symbolId: string;
    timeframe: Timeframe;
    priceChangePct: number;
    oiChangePct: number;
    volumeChangePct: number;
  }) {
    const id = growthMetricDocId(data.symbolId, data.timeframe);
    const doc: GrowthMetricDoc = {
      symbolId: data.symbolId,
      timeframe: data.timeframe,
      priceChangePct: data.priceChangePct,
      oiChangePct: data.oiChangePct,
      volumeChangePct: data.volumeChangePct,
      calculatedAt: new Date(),
    };
    await getFirestore().collection(COLLECTIONS.growthMetrics).doc(id).set(doc, { merge: true });
    return { id, ...doc };
  },

  async findBySymbolId(symbolId: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.growthMetrics)
      .where('symbolId', '==', symbolId)
      .get();
    return snap.docs.map((d) => docWithId(d.id, d.data() as GrowthMetricDoc));
  },
};
