/**
 * One-off, idempotent seed script: 10 properties per property type (8
 * types = 80 properties) across real Malaysian cities/states. Safe to
 * re-run — every property is upserted by a fixed id, and this script
 * never touches users, amenities, or any other seed data.
 *
 * Run with: npx tsx prisma/seed_malaysia_properties.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: './prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

const LOCATIONS = [
  { city: 'Kuala Lumpur', state: 'WP Kuala Lumpur' },
  { city: 'Petaling Jaya', state: 'Selangor' },
  { city: 'Subang Jaya', state: 'Selangor' },
  { city: 'Shah Alam', state: 'Selangor' },
  { city: 'Johor Bahru', state: 'Johor' },
  { city: 'George Town', state: 'Penang' },
  { city: 'Ipoh', state: 'Perak' },
  { city: 'Kota Kinabalu', state: 'Sabah' },
  { city: 'Kuching', state: 'Sarawak' },
  { city: 'Melaka City', state: 'Melaka' },
];

const STREETS = [
  'Jalan Ampang', 'Jalan Bukit Bintang', 'Jalan Sultan Ismail', 'Jalan Tun Razak',
  'Jalan SS2/24', 'Jalan Kiara', 'Persiaran Gurney', 'Jalan Tebrau',
  'Jalan Kuching', 'Jalan Molek', 'Lorong Perak', 'Jalan Bandar',
];

// 10 status values per type, weighted mostly AVAILABLE with a realistic
// mix of RENTED / MAINTENANCE so the status field (now surfaced directly
// in the Add Property form) has something to actually demonstrate.
const STATUS_CYCLE = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'RENTED', 'AVAILABLE', 'RENTED', 'AVAILABLE', 'MAINTENANCE', 'AVAILABLE', 'RENTED'];

type TypeSpec = {
  type: string;
  label: string;
  baseRent: number;
  rentStep: number;
};

const TYPES: TypeSpec[] = [
  { type: 'apartment', label: 'Apartment', baseRent: 1400, rentStep: 120 },
  { type: 'house', label: 'House', baseRent: 2600, rentStep: 200 },
  { type: 'condo', label: 'Condominium', baseRent: 2000, rentStep: 150 },
  { type: 'townhouse', label: 'Townhouse', baseRent: 2200, rentStep: 160 },
  { type: 'studio', label: 'Studio', baseRent: 1100, rentStep: 90 },
  { type: 'duplex', label: 'Duplex', baseRent: 2400, rentStep: 180 },
  { type: 'land', label: 'Land Plot', baseRent: 800, rentStep: 100 },
  { type: 'commercial', label: 'Shop Lot', baseRent: 3500, rentStep: 250 },
];

async function main() {
  console.log('Seeding Malaysia properties...');

  const landlord = await prisma.user.findUnique({ where: { email: 'landlord@prms.com' } });
  if (!landlord) throw new Error('landlord@prms.com not found — run the main seed first.');

  let created = 0;
  for (const spec of TYPES) {
    for (let i = 1; i <= 10; i++) {
      const id = `my-${spec.type}-${String(i).padStart(3, '0')}`;
      const loc = LOCATIONS[(i - 1) % LOCATIONS.length];
      const street = STREETS[(i - 1) % STREETS.length];
      const rent = spec.baseRent + spec.rentStep * (i - 1);
      const status = STATUS_CYCLE[(i - 1) % STATUS_CYCLE.length];

      await prisma.property.upsert({
        where: { id },
        create: {
          id,
          title: `${spec.label} in ${loc.city}`,
          address: `${i} ${street}, ${loc.city}`,
          property_type: spec.type,
          rent,
          city: loc.city,
          state: loc.state,
          ownerId: landlord.id,
          status: status as any,
        },
        update: {
          title: `${spec.label} in ${loc.city}`,
          address: `${i} ${street}, ${loc.city}`,
          rent,
          city: loc.city,
          state: loc.state,
          status: status as any,
        },
      });
      created++;
    }
  }

  console.log(`Seeded ${created} Malaysian properties (10 per type across ${TYPES.length} types).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
