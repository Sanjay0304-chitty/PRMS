import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { databaseOptions } from './databaseConnection';

export const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseOptions()) });

/** Check connectivity and schema without changing accounts or running migrations. */
export async function bootstrap(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  await prisma.role.findFirst({ select: { id: true } });
  console.log('[DB] MySQL connection ready');
}
