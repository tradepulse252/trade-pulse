import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@tradepulse.io';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!ChangeMe';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', passwordHash, emailVerified: true },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      alertSettings: { create: {} },
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
