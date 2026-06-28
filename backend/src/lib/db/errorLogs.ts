import type { Query } from 'firebase-admin/firestore';
import { getFirestore } from '../firebase';
import { COLLECTIONS, type ErrorLogDoc } from './types';
import { docWithId, newId } from './helpers';

export const errorLogsRepo = {
  async create(data: {
    source: string;
    level: string;
    message: string;
    stack?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const id = newId();
    const doc: ErrorLogDoc = {
      source: data.source,
      level: data.level,
      message: data.message,
      stack: data.stack ?? null,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    await getFirestore().collection(COLLECTIONS.errorLogs).doc(id).set(doc);
    return { id, ...doc };
  },

  async findMany(options: { source?: string; limit?: number; skip?: number }) {
    let query: Query = getFirestore().collection(COLLECTIONS.errorLogs);
    if (options.source) {
      query = query.where('source', '==', options.source);
    }
    query = query.orderBy('createdAt', 'desc').limit(options.limit ?? 50);
    const snap = await query.get();
    return snap.docs.map((d) => docWithId(d.id, d.data() as ErrorLogDoc));
  },

  async count(source?: string): Promise<number> {
    let query: Query = getFirestore().collection(COLLECTIONS.errorLogs);
    if (source) {
      query = query.where('source', '==', source);
    }
    const snap = await query.count().get();
    return snap.data().count;
  },
};
