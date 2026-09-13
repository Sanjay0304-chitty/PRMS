import { prisma } from '../../db';

interface CreateCategoryInput {
  name: string;
  description?: string;
  isShared?: boolean;
  ownerId?: string;
}

interface UpdateCategoryInput {
  name?: string;
  description?: string;
  isShared?: boolean;
  isDisabled?: boolean;
}

export async function listCategories({
  isShared,
  isDisabled,
  ownerId,
}: {
  isShared?: boolean;
  isDisabled?: boolean;
  ownerId?: string;
} = {}) {
  const where: Record<string, any> = {};
  if (typeof isShared === 'boolean') where.isShared = isShared;
  if (typeof isDisabled === 'boolean') where.isDisabled = isDisabled;
  if (ownerId) where.ownerId = ownerId;

  return prisma.propertyCategory.findMany({
    where,
    include: { owner: { select: { id: true, email: true, full_name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getSharedCategories() {
  return prisma.propertyCategory.findMany({
    where: { isShared: true, isDisabled: false },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoryById(id: string) {
  return prisma.propertyCategory.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, email: true, full_name: true } },
      properties: { select: { id: true, title: true, address: true } },
    },
  });
}

export async function createCategory(input: CreateCategoryInput, userId: string) {
  const { name, description, isShared = true, ownerId } = input;
  if (!name || typeof name !== 'string') {
    throw new Error('Category name is required');
  }

  return prisma.propertyCategory.create({
    data: {
      name,
      description,
      isShared,
      ownerId: ownerId || userId,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  if (!id) throw new Error('Category ID is required');

  const category = await prisma.propertyCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Category not found');

  return prisma.propertyCategory.update({
    where: { id },
    data: input,
  });
}

export async function deleteCategory(id: string) {
  if (!id) throw new Error('Category ID is required');

  const category = await prisma.propertyCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Category not found');

  // Prevent deletion if properties are still assigned
  const propCount = await prisma.property.count({ where: { categoryId: id } });
  if (propCount > 0) {
    throw new Error(`Cannot delete: ${propCount} propert${propCount === 1 ? 'y' : 'ies'} still assigned`);
  }

  return prisma.propertyCategory.delete({ where: { id } });
}

// Soft delete for a landlord's own personal category - unlike the admin
// deleteCategory() above, this never hard-deletes: a landlord's own
// category can still be referenced by their own properties, and this
// endpoint has no reason to block on that the way the admin hard-delete
// path does. Kept separate from deleteCategory() rather than adding an
// optional param to it, so the existing admin delete behavior (always
// hard delete, blocked while properties are assigned) is untouched.
export async function disablePersonalCategory(id: string) {
  const category = await prisma.propertyCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Category not found');

  // The frontend has no restore UI for a disabled personal category (the
  // list view filters isDisabled rows out entirely), so this is a one-way
  // "delete" from the user's perspective. The row itself is kept (categories
  // can still be referenced by existing properties), but its name is freed
  // up here so the owner can immediately reuse it — otherwise the
  // (ownerId, name) unique constraint would block them forever with no way
  // to see or rename the row that's holding the name.
  return prisma.propertyCategory.update({
    where: { id },
    data: { isDisabled: true, name: `${category.name} (deleted-${Date.now()})` },
  });
}

export async function toggleCategoryDisabled(id: string) {
  const category = await prisma.propertyCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Category not found');

  return prisma.propertyCategory.update({
    where: { id },
    data: { isDisabled: !category.isDisabled },
  });
}

export async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: 'Apartment', description: 'Standard apartment unit', isShared: true },
    { name: 'Condo', description: 'Condominium property', isShared: true },
    { name: 'House', description: 'Single-family house', isShared: true },
    { name: 'Townhouse', description: 'Townhouse or row house', isShared: true },
    { name: 'Villa', description: 'Luxury villa or estate', isShared: true },
    { name: 'Studio', description: 'Studio apartment', isShared: true },
    { name: 'Penthouse', description: 'Penthouse unit', isShared: true },
  ];

  const created: any[] = [];
  for (const cat of defaults) {
    const existing = await prisma.propertyCategory.findUnique({
      where: { ownerId_name: { ownerId: userId, name: cat.name } },
    });
    if (!existing) {
      const c = await prisma.propertyCategory.create({
        data: { ...cat, ownerId: userId },
      });
      created.push(c);
    }
  }
  return created;
}
