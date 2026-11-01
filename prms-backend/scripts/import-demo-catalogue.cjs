const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

const backend = path.resolve(__dirname, '..');
const catalogueFile = path.join(backend, 'prisma/data/demo-catalogue.json');
const stableId = (propertyId, url) => {
  const hex = crypto.createHash('sha256').update(`demo-catalogue:${propertyId}:${url}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
};

function planCatalogue(db, catalogue) {
  if (catalogue.version !== 1 || !Array.isArray(catalogue.properties)) throw new Error('Unsupported catalogue format');
  for (const [table, column] of [['properties','catalogueOrder'], ['property_images','sortOrder']]) {
    if (!db.prepare(`PRAGMA table_info("${table}")`).all().some(c => c.name === column)) {
      throw new Error('Run npx prisma migrate deploy before importing the demo catalogue.');
    }
  }
  const john = db.prepare('SELECT id,is_active FROM users WHERE email=?').get('landlord@prms.com');
  if (!john?.is_active) throw new Error('An active John Landlord demo account is required');
  const seen = new Set();
  const matched = [], missing = [], transferred = [], protectedOwners = [];
  for (const entry of catalogue.properties) {
    if (seen.has(entry.id) || !Number.isSafeInteger(entry.order) || entry.order < 0 || !Array.isArray(entry.images)) throw new Error('Invalid catalogue entry');
    seen.add(entry.id);
    for (const image of entry.images) {
      if (typeof image.url !== 'string' || !/^https:\/\//.test(image.url)) throw new Error('Only HTTPS reference images are supported');
    }
    const property = db.prepare('SELECT * FROM properties WHERE id=?').get(entry.id);
    if (!property) { missing.push({ id: entry.id, title: entry.title }); continue; }
    if (property.title !== entry.title || property.address !== entry.address) throw new Error(`Property identity mismatch: ${entry.id}`);
    let transfer = false;
    if (entry.assignToJohn && property.ownerId !== john.id) {
      const related = {};
      for (const table of ['bookings','viewing_appointments','maintenance_tickets','agent_properties']) {
        related[table] = db.prepare(`SELECT count(*) n FROM "${table}" WHERE propertyId=?`).get(entry.id).n;
      }
      if (Object.values(related).some(Boolean)) protectedOwners.push({ id: entry.id, title: entry.title, related });
      else { transfer = true; transferred.push({ id: entry.id, title: entry.title }); }
    }
    matched.push({ entry, property, transfer });
  }
  return { john, matched, missing, transferred, protectedOwners };
}

function syncCatalogue(db, catalogue, apply = false) {
  const plan = planCatalogue(db, catalogue);
  const report = { applied: apply, matched: plan.matched.length, imagesInReference: plan.matched.reduce((n,p) => n+p.entry.images.length,0),
    ownershipTransfers: plan.transferred, protectedOwners: plan.protectedOwners, missingProperties: plan.missing, insertedImages: 0, reusedImages: 0 };
  if (!apply) return report;
  db.transaction(() => {
    for (const { entry, transfer } of plan.matched) {
      db.prepare('UPDATE properties SET catalogueOrder=? WHERE id=?').run(entry.order, entry.id);
      if (transfer) db.prepare('UPDATE properties SET ownerId=? WHERE id=?').run(plan.john.id, entry.id);
      const existing = db.prepare('SELECT * FROM property_images WHERE propertyId=? ORDER BY sortOrder,rowid').all(entry.id);
      const desired = new Set();
      for (const [sortOrder, image] of entry.images.entries()) {
        const found = existing.find(row => row.type === 'image' && row.url === image.url);
        if (found) {
          db.prepare('UPDATE property_images SET sortOrder=? WHERE id=?').run(sortOrder, found.id);
          desired.add(found.id); report.reusedImages++;
        } else {
          const id = stableId(entry.id, image.url);
          db.prepare('INSERT INTO property_images (id,propertyId,url,type,sortOrder) VALUES (?,?,?,?,?)').run(id, entry.id, image.url, 'image', sortOrder);
          desired.add(id); report.insertedImages++;
        }
      }
      // Keep original photos, videos and documents and their IDs/URLs intact.
      let extraOrder = Math.max(1000, entry.images.length);
      for (const image of existing) {
        if (!desired.has(image.id)) db.prepare('UPDATE property_images SET sortOrder=? WHERE id=?').run(extraOrder++, image.id);
      }
    }
    if (db.pragma('foreign_key_check').length) throw new Error('Import failed relationship validation');
  })();
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/import-demo-catalogue.cjs [--apply]');
  const apply = args.includes('--apply');
  const db = new Database(path.join(backend,'prisma/dev.db'), { readonly: !apply });
  db.pragma('foreign_keys = ON');
  try {
    const catalogue = JSON.parse(fs.readFileSync(catalogueFile,'utf8'));
    // Validate before making a backup or changing any records.
    planCatalogue(db,catalogue);
    let backup;
    if (apply) {
      const directory = path.join(backend,'../.artifacts/demo-catalogue-backups');
      fs.mkdirSync(directory,{recursive:true}); backup = path.join(directory,`before-${Date.now()}.db`);
      await db.backup(backup);
    }
    const report = syncCatalogue(db,catalogue,apply);
    if (backup) report.backup = backup;
    console.log(JSON.stringify(report,null,2));
  } finally { db.close(); }
}

module.exports = { planCatalogue, syncCatalogue };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
