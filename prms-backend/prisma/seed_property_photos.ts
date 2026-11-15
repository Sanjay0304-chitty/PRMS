import { prisma } from '../src/db';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const photos = [
  ['01-exterior.png', 'Sample exterior'],
  ['02-living-room.png', 'Sample living room'],
  ['03-dining-room.png', 'Sample dining room'],
  ['04-bathroom.png', 'Sample bathroom'],
  ['05-bedroom.png', 'Sample bedroom'],
].map(([file, name]) => ({ file, name, url: `/images/demo-property-gallery/${file}` }));

async function main() {
  const backend = path.resolve(__dirname, '..');
  for (const photo of photos) {
    if (!fs.existsSync(path.join(backend, 'public', photo.url))) {
      throw new Error(`Missing sample image: ${photo.file}`);
    }
  }
  const properties = await prisma.property.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
  });
  const additions = properties.flatMap(property => {
    const existing = new Set(property.images.map(image => image.url));
    let sortOrder = property.images.reduce((max, image) => Math.max(max, image.sortOrder), -1);
    return photos.filter(photo => !existing.has(photo.url)).map(photo => ({
      id: `sample-photo-${createHash('sha256').update(`${property.id}:${photo.url}`).digest('hex').slice(0, 32)}`,
      propertyId: property.id, url: photo.url, thumbnailUrl: photo.url,
      type: 'image', documentName: photo.name, sortOrder: ++sortOrder,
    }));
  });
  if (process.argv.includes('--dry-run')) {
    console.log(`${properties.length} properties; ${additions.length} missing sample photos. No records changed.`);
    return;
  }
  const backup = path.resolve(backend, '../.artifacts/property-photo-import', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'before.json'), JSON.stringify(properties, null, 2));
  const result = await prisma.propertyImage.createMany({ data: additions, skipDuplicates: true });
  const updated = await prisma.property.findMany({
    select: { id: true, images: { select: { id: true, url: true, sortOrder: true } } },
  });
  for (const property of updated) {
    if (photos.some(photo => !property.images.some(image => image.url === photo.url))) {
      throw new Error(`Photo verification failed for property ${property.id}.`);
    }
  }
  for (const property of properties) {
    const after = updated.find(row => row.id === property.id);
    if (property.images.some(image => !after?.images.some(row => row.id === image.id && row.url === image.url && row.sortOrder === image.sortOrder))) {
      throw new Error(`Existing image verification failed for property ${property.id}.`);
    }
  }
  fs.writeFileSync(path.join(backup, 'result.json'), JSON.stringify({ properties: updated.length, added: result.count, urls: photos.map(photo => photo.url) }, null, 2));
  console.log(`Added ${result.count} sample photos across ${updated.length} properties. All five are present on every property; existing photos and ordering were preserved.`);
  console.log('Private image-record backup saved under .artifacts/property-photo-import.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
