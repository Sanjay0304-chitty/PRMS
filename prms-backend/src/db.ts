import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/prms_db');
const prisma = new PrismaClient({ adapter });

/**
 * Resolve the project root (where package.json / prisma/ live).
 * Works whether the app is compiled to dist/ or run via tsx/ts-node.
 */
function projectRoot(): string {
  // Walk up from __dirname until we find package.json
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return dir;
}

/**
 * Connect to MySQL, auto-create tables if missing, and ensure a default admin
 * account exists. Call once at app startup.
 */
export async function bootstrap(): Promise<void> {
  const root = projectRoot();
  const schemaPath = path.join(root, 'prisma', 'schema.prisma');

  // ---- 1. Verify connectivity ------------------------------------------------
  try {
    await prisma.$connect();
    await prisma.$queryRaw<unknown[]>`SELECT 1`;
    console.log('[DB] Connected to MySQL');
  } catch {
    console.error('[DB] Failed to connect to MySQL. Check DATABASE_URL in .env');
    throw new Error('DATABASE_URL is invalid or MySQL is not running');
  }

  // ---- 2. Ensure tables exist (db push, then migrate) ------
  try {
    console.log('[DB] Pushing schema to database (creates tables if missing)...');
    execSync(`npx prisma db push --schema="${schemaPath}"`, {
      cwd: root, encoding: 'utf8', stdio: 'inherit',
    });
    console.log('[DB] Schema pushed successfully');
  } catch {
    console.warn('[DB] Schema push had an issue – trying migrate deploy instead...');
    try {
      execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
        cwd: root, encoding: 'utf8', stdio: 'inherit',
      });
    } catch {
      console.warn('[DB] Both push and migrate had issues.');
    }
  }

  // ---- 3. Seed default roles (idempotent) ------------------------------------
  for (const name of ['Admin', 'Landlord', 'Tenant', 'Agent']) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  // ---- 4. Seed default admin user -------------------------------------------
  const bcrypt = await import('bcryptjs');
  const adminHash = bcrypt.default.hashSync('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@prms.com' },
    create: {
      email: 'admin@prms.com',
      passwordHash: adminHash,
      firebase_uid: 'admin-001',
      full_name: 'System Admin',
      is_active: true,
      UserRole: {
        create: [{ role: { connect: { name: 'Admin' } } }],
      },
    },
    update: {
      passwordHash: adminHash,
      full_name: 'System Admin',
      is_active: true,
    },
  });
  console.log('[DB] Default admin ready → admin@prms.com / Admin123!');
}

export { prisma };
