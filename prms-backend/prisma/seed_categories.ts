import { prisma } from '../src/db';
import { seedDefaultCategories } from '../src/modules/category/service_category';

async function main() {
  const admin = await prisma.user.findFirst({
    where: { UserRole: { some: { role: { name: 'Admin' } } } },
    orderBy: { created_at: 'asc' },
  });
  if (!admin) throw new Error('Create an administrator before seeding shared categories.');
  const created = await seedDefaultCategories(admin.id);
  console.log(`Added ${created.length} missing shared categories. Existing categories were preserved.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
