import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';

let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function initFirebase(): Promise<boolean> {
  if (firebaseApp) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[firebase] Not configured — Firestore and push disabled');
    return false;
  }

  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      firebaseApp = admin.app();
    }

    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    firestoreDb = admin.firestore(firebaseApp);
    if (databaseId !== '(default)') {
      firestoreDb.settings({ databaseId });
    }

    console.log(`[firebase] Initialized (project: ${projectId}, db: ${databaseId})`);
    return true;
  } catch (error) {
    console.warn('[firebase] Init failed:', (error as Error).message);
    return false;
  }
}

export function getFirebaseApp(): App | null {
  return firebaseApp;
}

export function getFirestore(): Firestore {
  if (!firestoreDb) {
    throw new Error('Firestore not initialized — call initFirebase() first');
  }
  return firestoreDb;
}

export async function pingFirestore(): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    await firestoreDb.collection('_health').doc('ping').set(
      { checkedAt: new Date() },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}
