import { catalogueOrder, photoOrder } from '../../utils/catalogueOrder';
import { prisma } from '../../db';

export async function searchProperties(query: { location?: string; property_type?: string; min_price?: string; max_price?: string; amenity?: string; page?: string; limit?: string; sort?: string; q?: string; }) {
  const where: any = { status: { not: 'INACTIVE' } };
  const term = (query.location || query.q || '').trim();
  if (term) where.OR = ['title', 'city', 'address', 'state', 'property_type'].map(field => ({ [field]: { contains: term } }));
  if (query.property_type) where.property_type = query.property_type;
  if (query.min_price || query.max_price) {
    where.rent = {};
    if (query.min_price) where.rent.gte = parseFloat(query.min_price);
    if (query.max_price) where.rent.lte = parseFloat(query.max_price);
  }
  if (query.amenity) where.amenities = { some: { name: { contains: query.amenity } } };

  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');

  const [properties, total] = await Promise.all([
    prisma.property.findMany({ where, include: { owner: { select: { id: true, full_name: true, email: true } }, amenities: true, images: { take: 3, orderBy: photoOrder }, category: true }, skip: (page - 1) * limit, take: limit, orderBy: query.sort === 'price_asc' ? [{ rent: 'asc' }, ...catalogueOrder] : query.sort === 'price_desc' ? [{ rent: 'desc' }, ...catalogueOrder] : catalogueOrder }),
    prisma.property.count({ where }),
  ]);
  return { properties, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function toggleFavorite(userId: string, propertyId: string) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
    return false;
  }
  await prisma.favorite.create({ data: { userId, propertyId } });
  return true;
}

export async function getFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    include: { property: { include: { images: { take: 1, orderBy: photoOrder } } } },
  });
}
