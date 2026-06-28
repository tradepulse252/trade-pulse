import { getFirestore } from '../firebase';
import { COLLECTIONS, type UserDoc, UserRole } from './types';
import { DEFAULT_ALERT_SETTINGS, docWithId, newId } from './helpers';
import { alertSettingsRepo } from './alertSettings';

export const usersRepo = {
  async findById(id: string) {
    const snap = await getFirestore().collection(COLLECTIONS.users).doc(id).get();
    if (!snap.exists) return null;
    return docWithId(snap.id, snap.data() as UserDoc);
  },

  async findByEmail(email: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as UserDoc);
  },

  async findByVerifyToken(token: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('verifyToken', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as UserDoc);
  },

  async findByResetToken(token: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('resetToken', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as UserDoc);
  },

  async findByEmailAndVerifyCode(email: string, code: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('email', '==', email.toLowerCase())
      .where('verifyCode', '==', code)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as UserDoc);
  },

  async findByEmailAndResetCode(email: string, code: string) {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('email', '==', email.toLowerCase())
      .where('resetCode', '==', code)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return docWithId(doc.id, doc.data() as UserDoc);
  },

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string | null;
    emailVerified?: boolean;
    verifyToken?: string | null;
    verifyCode?: string | null;
    verifyExpiresAt?: Date | null;
    role?: UserRole;
    withDefaultAlertSettings?: boolean;
  }) {
    const now = new Date();
    const id = newId();
    const doc: UserDoc = {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name ?? null,
      role: data.role ?? UserRole.USER,
      fcmToken: null,
      isActive: true,
      emailVerified: data.emailVerified ?? false,
      verifyToken: data.verifyToken ?? null,
      verifyCode: data.verifyCode ?? null,
      verifyExpiresAt: data.verifyExpiresAt ?? null,
      resetToken: null,
      resetCode: null,
      resetExpiresAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await getFirestore().collection(COLLECTIONS.users).doc(id).set(doc);

    if (data.withDefaultAlertSettings !== false) {
      await alertSettingsRepo.createForUser(id);
    }

    return { id, ...doc };
  },

  async update(id: string, data: Partial<UserDoc>) {
    const payload = { ...data, updatedAt: new Date() };
    await getFirestore().collection(COLLECTIONS.users).doc(id).update(payload);
    return this.findById(id);
  },

  async upsertByEmail(
    email: string,
    createData: {
      email: string;
      passwordHash: string;
      name?: string | null;
      emailVerified?: boolean;
      verifyToken?: string | null;
      verifyCode?: string | null;
      verifyExpiresAt?: Date | null;
      role?: UserRole;
      withDefaultAlertSettings?: boolean;
    },
    update: Partial<UserDoc>
  ) {
    const existing = await this.findByEmail(email);
    if (existing) {
      const updated = await this.update(existing.id, update);
      return updated!;
    }
    return this.create(createData);
  },

  async countActive(): Promise<number> {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('isActive', '==', true)
      .count()
      .get();
    return snap.data().count;
  },

  async findActiveWithAlertSettings() {
    const snap = await getFirestore()
      .collection(COLLECTIONS.users)
      .where('isActive', '==', true)
      .get();

    const users = await Promise.all(
      snap.docs.map(async (doc) => {
        const user = docWithId(doc.id, doc.data() as UserDoc);
        const settings = await alertSettingsRepo.findByUserId(user.id);
        return { ...user, alertSettings: settings ? [settings] : [] };
      })
    );

    return users;
  },
};
