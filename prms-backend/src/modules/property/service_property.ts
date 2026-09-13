import { prisma } from '../../db';

/** Convert date-only strings (YYYY-MM-DD) to Date objects for Prisma DateTime fields */
export function normalizeDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function getAllProperties(page = 1, limit = 10, filters: { type?: string; search?: string } = {}) {
  const where: any = {};

  // SQLite has no case-insensitive `mode` option, and stored property_type
  // values have inconsistent casing from older data — match common variants.
  if (filters.type) {
    const t = filters.type;
    const variants = Array.from(new Set([t, t.toLowerCase(), t.toUpperCase(), t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()]));
    where.property_type = { in: variants };
  }

  if (filters.search) {
    const s = filters.search;
    where.OR = [
      { title: { contains: s } },
      { address: { contains: s } },
      { city: { contains: s } },
    ];
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { owner: { select: { id: true, full_name: true, email: true } }, amenities: true, images: true, category: true } }),
    prisma.property.count({ where }),
  ]);
  return { properties, total };
}

export async function getPropertyById(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: { owner: { select: { id: true, full_name: true, email: true, phone: true, profile_img_url: true } }, amenities: true, images: true, category: true },
  });
}

export async function createProperty(data: any, ownerId: string) {
  const amenitiesList = data.amenities;
  delete data.amenities;
  const imagesList = data.images;
  delete data.images;

  // Normalize date-only strings to Date objects for Prisma DateTime fields
  if (data.availableFrom) data.availableFrom = normalizeDate(data.availableFrom);
  if (data.availableTo) data.availableTo = normalizeDate(data.availableTo);

  // Prisma 7: use relation syntax instead of scalar FK fields in create data
  let categoryConnect = data.categoryId
    ? { connect: { id: data.categoryId } }
    : undefined;
  if (data.categoryId) delete data.categoryId;

  const property = await prisma.property.create({
    data: { ...data, category: categoryConnect, owner: { connect: { id: ownerId } } },
  });

  if (amenitiesList && amenitiesList.length > 0) {
    await prisma.amenity.createMany({ data: amenitiesList.map((a: any) => ({ ...a, propertyId: property.id })) });
  }
  if (imagesList && imagesList.length > 0) {
    await prisma.propertyImage.createMany({ data: imagesList.map((img: any) => ({ ...img, propertyId: property.id })) });
  }

  return prisma.property.findUnique({ where: { id: property.id }, include: { amenities: true, images: true, owner: { select: { id: true, full_name: true, email: true, phone: true, profile_img_url: true } }, category: true } });
}

export async function updateProperty(id: string, data: any) {
  // Separate non-core fields (media + amenities) from the data object
  const imagesArr = data.images;
  const videosArr = data.videos;
  const amenitiesArr = data.amenities;
  delete data.images;
  delete data.videos;
  delete data.amenities;

  // Normalize date-only strings for Prisma DateTime fields
  if (data.availableFrom != null) data.availableFrom = normalizeDate(data.availableFrom);
  if (data.availableTo != null) data.availableTo = normalizeDate(data.availableTo);

  // Atomic core-field update
  const updated = await prisma.property.update({
    where: { id },
    data,
    include: { amenities: true, images: true, owner: { select: { id: true, full_name: true, email: true, phone: true, profile_img_url: true } }, category: true },
  });

  // Sync media (images + videos)
  if (Array.isArray(imagesArr)) {
    await syncImages(id, imagesArr);
  }
  if (Array.isArray(videosArr)) {
    await syncVideos(id, videosArr);
  }

  // Sync amenities
  if (Array.isArray(amenitiesArr)) {
    await syncAmenities(id, amenitiesArr);
  }

  return prisma.property.findUnique({
    where: { id },
    include: { amenities: true, images: true, owner: { select: { id: true, full_name: true, email: true, phone: true, profile_img_url: true } }, category: true },
  });
}

async function syncImages(propertyId: string, incomingImages: any[]) {
  const existing = await prisma.propertyImage.findMany({ where: { propertyId } });
  const existingMap = new Map(existing.map((img) => [img.id, img]));

  const idsToAdd: string[] = [];
  const idsToRemove: string[] = [];
  const incomingIds = new Set<string>();

  for (const img of incomingImages) {
    incomingIds.add(img.id);
    if (!existingMap.has(img.id)) {
      idsToAdd.push(img.id);
    }
  }

  for (const img of existing) {
    if (!incomingIds.has(img.id)) {
      idsToRemove.push(img.id);
    }
  }

  if (idsToAdd.length > 0) {
    await prisma.propertyImage.createMany({
      data: incomingImages
        .filter((img) => idsToAdd.includes(img.id))
        .map((img) => ({ ...img, propertyId })),
    });
  }
  if (idsToRemove.length > 0) {
    await prisma.propertyImage.deleteMany({
      where: { id: { in: idsToRemove } },
    });
  }
}

async function syncVideos(propertyId: string, incomingVideos: any[]) {
  const existing = await prisma.propertyImage.findMany({
    where: { propertyId, type: 'video' },
  });
  const existingMap = new Map(existing.map((vid) => [vid.id, vid]));

  const incomingIds = new Set<string>();
  const idsToAdd: string[] = [];
  const idsToRemove: string[] = [];

  for (const vid of incomingVideos) {
    incomingIds.add(vid.id);
    if (!existingMap.has(vid.id)) {
      idsToAdd.push(vid.id);
    }
  }
  for (const vid of existing) {
    if (!incomingIds.has(vid.id)) {
      idsToRemove.push(vid.id);
    }
  }

  if (idsToAdd.length > 0) {
    await prisma.propertyImage.createMany({
      data: incomingVideos
        .filter((v) => idsToAdd.includes(v.id))
        .map((v) => ({ ...v, propertyId, type: 'video' })),
    });
  }
  if (idsToRemove.length > 0) {
    await prisma.propertyImage.deleteMany({
      where: { id: { in: idsToRemove } },
    });
  }
}

async function syncAmenities(propertyId: string, incomingAmenities: any[]) {
  const existing = await prisma.amenity.findMany({
    where: { propertyId },
  });
  const existingMap = new Map(existing.map((a) => [a.id, a]));
  const incomingIds = new Set<string>();

  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const toDelete: string[] = [];

  for (const a of incomingAmenities) {
    incomingIds.add(a.id);
    if (existingMap.has(a.id)) {
      toUpdate.push(a);
    } else {
      toCreate.push({ ...a, propertyId });
    }
  }

  for (const a of existing) {
    if (!incomingIds.has(a.id)) {
      toDelete.push(a.id);
    }
  }

  if (toUpdate.length > 0) {
    for (const a of toUpdate) {
      await prisma.amenity.update({
        where: { id: a.id },
        data: { name: a.name, description: a.description },
      });
    }
  }
  if (toCreate.length > 0) {
    await prisma.amenity.createMany({ data: toCreate });
  }
  if (toDelete.length > 0) {
    await prisma.amenity.deleteMany({ where: { id: { in: toDelete } } });
  }
}

export async function deactivateProperty(id: string) {
  return prisma.property.update({ where: { id }, data: { status: 'INACTIVE' } });
}

export async function addImage(propertyId: string, url: string, thumbnailUrl?: string) {
  return prisma.propertyImage.create({
    data: { propertyId, url, thumbnailUrl: thumbnailUrl || undefined, type: 'image' },
  });
}

export async function getImageById(imageId: string) {
  return prisma.propertyImage.findUnique({ where: { id: imageId } });
}

export async function deleteImage(imageId: string) {
  return prisma.propertyImage.delete({ where: { id: imageId } });
}

export async function addVideoToProperty(propertyId: string, url: string) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { videoUrls: true } });
  if (!prop) throw new Error('Property not found');
  const urls: string[] = (prop.videoUrls as string[]) || [];
  urls.push(url);
  return prisma.property.update({
    where: { id: propertyId },
    data: { videoUrls: urls as any },
  });
}

export async function removeVideoFromProperty(propertyId: string, url: string) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { videoUrls: true } });
  if (!prop) throw new Error('Property not found');
  const urls: string[] = (prop.videoUrls as string[]) || [];
  if (!urls.includes(url)) return null;
  return prisma.property.update({
    where: { id: propertyId },
    data: { videoUrls: urls.filter((u: string) => u !== url) as any },
  });
}

export async function addDocumentToProperty(propertyId: string, url: string) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { documentUrls: true } });
  if (!prop) throw new Error('Property not found');
  const urls: string[] = (prop.documentUrls as string[]) || [];
  urls.push(url);
  return prisma.property.update({
    where: { id: propertyId },
    data: { documentUrls: urls as any },
  });
}

export async function removeDocumentFromProperty(propertyId: string, url: string) {
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { documentUrls: true } });
  if (!prop) throw new Error('Property not found');
  const urls: string[] = (prop.documentUrls as string[]) || [];
  if (!urls.includes(url)) return null;
  return prisma.property.update({
    where: { id: propertyId },
    data: { documentUrls: urls.filter((u: string) => u !== url) as any },
  });
}

export async function getLandlordProperties(landlordId: string) {
  const properties = await prisma.property.findMany({
    where: { ownerId: landlordId },
    include: { amenities: true, images: true, category: true, agentProperties: { include: { agent: true } } },
  });
  return properties.map((p) => ({
    ...p,
    agentProperties: p.agentProperties.map((ap) => ap.agent),
  }));
}
