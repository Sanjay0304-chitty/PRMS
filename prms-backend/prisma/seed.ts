import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: './prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding roles...');
  for (const name of ['Admin', 'Landlord', 'Tenant', 'Agent']) {
    await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
  }

  const bcrypt = await import('bcryptjs');
  const hash = (p: string) => bcrypt.default.hash(p, 10);

  console.log('Seeding users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@prms.com' },
    create: {
      email: 'admin@prms.com', passwordHash: await hash('Admin123!'),
      firebase_uid: 'admin-001', full_name: 'System Admin', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Admin' } } }] },
    },
    update: { passwordHash: await hash('Admin123!'), full_name: 'System Admin' },
  });

  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@prms.com' },
    create: {
      email: 'landlord@prms.com', passwordHash: await hash('Landlord123!'),
      firebase_uid: 'landlord-001', full_name: 'John Landlord',
      phone: '+123****7890', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Landlord' } } }] },
    },
    update: { passwordHash: await hash('Landlord123!') },
  });

  const tenant = await prisma.user.upsert({
    where: { email: 'tenant@prms.com' },
    create: {
      email: 'tenant@prms.com', passwordHash: await hash('Tenant123!'),
      firebase_uid: 'tenant-001', full_name: 'Jane Tenant',
      phone: '+198****4321', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Tenant' } } }] },
    },
    update: { passwordHash: await hash('Tenant123!') },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@prms.com' },
    create: {
      email: 'agent@prms.com', passwordHash: await hash('Agent123!'),
      firebase_uid: 'agent-001', full_name: 'Sam Agent',
      phone: '+199****5678', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Agent' } } }] },
    },
    update: { passwordHash: await hash('Agent123!') },
  });

  console.log('Seeding properties...');
  const prop1 = await prisma.property.upsert({
    where: { id: 'prop-001' },
    create: {
      id: 'prop-001', title: 'Modern apartment in downtown', address: '123 Main St',
      property_type: 'apartment', rent: 2500, city: 'Springfield', state: 'IL',
      ownerId: landlord.id, status: 'AVAILABLE',
    },
    update: { ownerId: landlord.id },
  });

  const prop2 = await prisma.property.upsert({
    where: { id: 'prop-002' },
    create: {
      id: 'prop-002', title: 'Cozy studio near campus', address: '456 University Ave',
      property_type: 'studio', rent: 1800, city: 'Springfield', state: 'IL',
      ownerId: landlord.id, status: 'AVAILABLE',
    },
    update: { ownerId: landlord.id },
  });

  console.log('Seeding amenities...');
  await prisma.amenity.deleteMany();
  await prisma.amenity.createMany({
    data: [
      { name: 'WiFi', description: 'High-speed WiFi', propertyId: prop1.id },
      { name: 'Parking', description: 'Free parking', propertyId: prop1.id },
      { name: 'Laundry', description: 'In-unit laundry', propertyId: prop2.id },
    ],
  });

  console.log('Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'app_name' },
    create: { key: 'app_name', value: 'PRMS', category: 'general', description: 'App name' },
    update: {},
  });
  await prisma.systemSetting.upsert({
    where: { key: 'currency' },
    create: { key: 'currency', value: 'USD', category: 'general', description: 'Default currency' },
    update: {},
  });

  console.log('Seeding agent records...');
  const agentRecord = await prisma.agent.upsert({
    where: { userId: agent.id },
    create: { userId: agent.id },
    update: {},
  });

  console.log('Seeding agent-property assignments...');
  await prisma.agentProperty.upsert({
    where: { agentId_propertyId: { agentId: agentRecord.id, propertyId: prop1.id } },
    create: { agentId: agentRecord.id, propertyId: prop1.id },
    update: {},
  });
  await prisma.agentProperty.upsert({
    where: { agentId_propertyId: { agentId: agentRecord.id, propertyId: prop2.id } },
    create: { agentId: agentRecord.id, propertyId: prop2.id },
    update: {},
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
