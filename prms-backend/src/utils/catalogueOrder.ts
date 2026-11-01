import { Prisma } from '@prisma/client';

export const catalogueOrder: Prisma.PropertyOrderByWithRelationInput[] = [
  { catalogueOrder: 'asc' },
  { id: 'desc' },
];

export const photoOrder: Prisma.PropertyImageOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { id: 'asc' },
];
