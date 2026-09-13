/**
 * One-off, idempotent import of real Malaysian property listing data
 * (100 rows, sourced from two spreadsheets: Property_Listing.xlsx and
 * Property.xlsx) into prisma/data/malaysia_listings.json. Safe to re-run
 * — every property is upserted by its fixed id (mrl-001..mrl-100), and
 * this script never touches users or any other seed data.
 *
 * The spreadsheets' own "Owner ID" column is fictional (numeric IDs that
 * don't correspond to any real User in this database), so ownership is
 * instead round-robined across the three real Landlord accounts that
 * exist today.
 *
 * Run with: npx tsx prisma/seed_malaysia_listings.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaBetterSqlite3({ url: './prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

type Listing = {
  id: string;
  title: string;
  address: string;
  property_type: string;
  original_type: string;
  rent: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  city: string;
  state: string;
  availableFrom: string | null;
  availableTo: string | null;
  sourceFile: string;
  sourceId: number;
};

async function main() {
  const dataPath = path.join(__dirname, 'data', 'malaysia_listings.json');
  const listings: Listing[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${listings.length} listings from ${dataPath}`);

  const landlords = await prisma.user.findMany({
    where: { UserRole: { some: { role: { name: 'Landlord' } } }, is_active: true },
    select: { id: true },
    orderBy: { email: 'asc' },
  });
  if (landlords.length === 0) throw new Error('No Landlord accounts found — run the main seed first.');
  console.log(`Round-robining ownership across ${landlords.length} landlord account(s).`);

  let created = 0;
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    const ownerId = landlords[i % landlords.length].id;

    await prisma.property.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        title: l.title,
        address: l.address,
        property_type: l.property_type,
        rent: l.rent,
        status: l.status,
        city: l.city,
        state: l.state,
        availableFrom: l.availableFrom ? new Date(l.availableFrom) : undefined,
        availableTo: l.availableTo ? new Date(l.availableTo) : undefined,
        ownerId,
      },
      update: {
        title: l.title,
        address: l.address,
        property_type: l.property_type,
        rent: l.rent,
        status: l.status,
        city: l.city,
        state: l.state,
        availableFrom: l.availableFrom ? new Date(l.availableFrom) : undefined,
        availableTo: l.availableTo ? new Date(l.availableTo) : undefined,
      },
    });
    created++;
  }

  console.log(`Seeded ${created} real Malaysian property listings.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
