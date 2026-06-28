import { getFirestore } from '../firebase';
import {
  COLLECTIONS,
  type FundingRateSnapshotDoc,
  type OpenInterestSnapshotDoc,
  type PriceSnapshotDoc,
  type VolumeSnapshotDoc,
} from './types';
import { docWithId, newId } from './helpers';

async function createSnapshot<T extends Record<string, unknown>>(
  collection: string,
  data: T
) {
  const id = newId();
  await getFirestore().collection(collection).doc(id).set(data);
  return { id, ...data };
}

async function findSnapshotsBySymbolId<T extends object>(
  collection: string,
  symbolId: string,
  order: 'asc' | 'desc',
  limit: number
) {
  const snap = await getFirestore()
    .collection(collection)
    .where('symbolId', '==', symbolId)
    .orderBy('timestamp', order)
    .limit(limit)
    .get();
  return snap.docs.map((d) => docWithId(d.id, d.data() as T));
}

export const snapshotsRepo = {
  createPrice(data: Omit<PriceSnapshotDoc, never>) {
    return createSnapshot(COLLECTIONS.priceSnapshots, data);
  },

  createOpenInterest(data: Omit<OpenInterestSnapshotDoc, never>) {
    return createSnapshot(COLLECTIONS.openInterestSnapshots, data);
  },

  createVolume(data: Omit<VolumeSnapshotDoc, never>) {
    return createSnapshot(COLLECTIONS.volumeSnapshots, data);
  },

  createFundingRate(data: Omit<FundingRateSnapshotDoc, never>) {
    return createSnapshot(COLLECTIONS.fundingRateSnapshots, data);
  },

  findPrices(symbolId: string, limit = 200, order: 'asc' | 'desc' = 'asc') {
    return findSnapshotsBySymbolId<PriceSnapshotDoc>(
      COLLECTIONS.priceSnapshots,
      symbolId,
      order,
      limit
    );
  },

  findOpenInterest(symbolId: string, limit = 200, order: 'asc' | 'desc' = 'asc') {
    return findSnapshotsBySymbolId<OpenInterestSnapshotDoc>(
      COLLECTIONS.openInterestSnapshots,
      symbolId,
      order,
      limit
    );
  },

  findVolumes(symbolId: string, limit = 200, order: 'asc' | 'desc' = 'asc') {
    return findSnapshotsBySymbolId<VolumeSnapshotDoc>(
      COLLECTIONS.volumeSnapshots,
      symbolId,
      order,
      limit
    );
  },

  findFundingRates(symbolId: string, limit = 200, order: 'asc' | 'desc' = 'asc') {
    return findSnapshotsBySymbolId<FundingRateSnapshotDoc>(
      COLLECTIONS.fundingRateSnapshots,
      symbolId,
      order,
      limit
    );
  },
};
