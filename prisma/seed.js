/* eslint-disable no-console */
require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.log('Seed: ADMIN_EMAIL/ADMIN_PASSWORD não definidos; pulando.');
    await prisma.$disconnect();
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      });
      console.log('Seed: usuário promovido para ADMIN:', adminEmail);
    } else {
      console.log('Seed: admin já existe:', adminEmail);
    }
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail.trim().toLowerCase(),
      passwordHash,
      name: adminName,
      role: 'ADMIN',
    },
  });
  console.log('Seed: admin criado:', adminEmail);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
