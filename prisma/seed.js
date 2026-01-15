import 'dotenv/config';

import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  // ensure DATABASE_URL is present before instantiating Prisma
  if (!process.env.DATABASE_URL) {
    console.log(
      'Seed: DATABASE_URL não definido. Configure o .env com DATABASE_URL ou exporte a variável e rode novamente. Pulando seed.',
    );
    return;
  }

  // create a Postgres pool + Prisma adapter to match app runtime
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ errorFormat: 'minimal', adapter });

  const adminLogin = process.env.ADMIN_LOGIN;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminLogin || !adminPassword) {
    console.log('Seed: ADMIN_LOGIN/ADMIN_PASSWORD não definidos; pulando.');
    await prisma.$disconnect();
    return;
  }

  const normalizedLogin = adminLogin.trim().toLowerCase();
  const existing = await prisma.usuario.findUnique({
    where: { login: normalizedLogin },
  });
  if (existing) {
    if (existing.papel !== 'ADMINISTRADOR') {
      await prisma.usuario.update({
        where: { login: normalizedLogin },
        data: { papel: 'ADMINISTRADOR' },
      });
      console.log(
        'Seed: usuário promovido para ADMINISTRADOR:',
        normalizedLogin,
      );
    } else {
      console.log('Seed: admin já existe:', normalizedLogin);
    }
    await prisma.$disconnect();
    return;
  }

  const senhaHash = await hash(adminPassword, 10);
  // use provided ADMIN_EMAIL if available else fall back to <login>@ufcnews.com
  const emailNormalized = (
    process.env.ADMIN_EMAIL || `${normalizedLogin}@ufcnews.com`
  )
    .trim()
    .toLowerCase();

  await prisma.usuario.create({
    data: {
      login: normalizedLogin,
      email: emailNormalized,
      senhaHash,
      nome: adminName,
      papel: 'ADMINISTRADOR',
    },
  });
  console.log('Seed: admin criado:', normalizedLogin);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
