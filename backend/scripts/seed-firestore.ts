import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from '../src/lib/db';
import { UserRole } from '../src/lib/db/types';

dotenv.config();

async function main() {
  const ready = await db.init();
  if (!ready) {
    throw new Error('Firestore not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@tradepulse.io';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!ChangeMe';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await db.users.findByEmail(adminEmail);
  const admin = existing
    ? await db.users.update(existing.id, {
        role: UserRole.ADMIN,
        passwordHash,
        emailVerified: true,
      })
    : await db.users.create({
        email: adminEmail,
        passwordHash,
        name: 'Admin',
        role: UserRole.ADMIN,
        emailVerified: true,
      });

  if (!admin) {
    throw new Error('Failed to seed admin user');
  }

  console.log(`✅ Admin user seeded: ${admin.email} (role: ${admin.role})`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
