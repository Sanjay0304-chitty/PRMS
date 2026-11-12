const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
if (require.main === module) require('./legacy-sqlite-guard.cjs')(process.argv.slice(2));
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function plan(db) {
  const john = db.prepare('SELECT id FROM users WHERE email=?').get('landlord@prms.com');
  if (!john) throw Error('John Landlord account missing');
  const groups = new Map();
  for (const row of db.prepare('SELECT * FROM properties ORDER BY catalogueOrder,id DESC').all()) {
    if (!row.title || !row.address) continue;
    const key = [row.title,row.address,row.city].map(normalize).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].filter(rows => rows.length > 1).map(rows => {
    const active = db.prepare(`SELECT * FROM bookings WHERE propertyId IN (${rows.map(()=>'?').join(',')}) AND status IN ('CONFIRMED','CHECKED_IN')`).all(...rows.map(r=>r.id));
    for (let i=0;i<active.length;i++) for (let j=i+1;j<active.length;j++) {
      if (active[i].propertyId !== active[j].propertyId && new Date(active[i].start_date)<new Date(active[j].end_date) && new Date(active[j].start_date)<new Date(active[i].end_date)) throw Error(`Conflicting tenancies: ${rows[0].title}`);
    }
    const johnRows = rows.filter(row=>row.ownerId===john.id);
    const candidates = johnRows.length ? johnRows : rows;
    const keep = candidates.find(row=>active.some(b=>b.propertyId===row.id)) || candidates[0];
    // Never silently move a signed tenancy between different owners.
    for (const row of rows) if (row.ownerId!==keep.ownerId) {
      const signed = db.prepare('SELECT count(*) n FROM agreements a JOIN bookings b ON b.id=a.bookingId WHERE b.propertyId=? AND (a.landlordSignedAt IS NOT NULL OR a.physicalVerifiedAt IS NOT NULL)').get(row.id).n;
      if (signed) throw Error(`Signed agreement requires review before ownership reconciliation: ${row.id}`);
    }
    return { keep, remove:rows.filter(row=>row.id!==keep.id), order:Math.min(...rows.map(row=>row.catalogueOrder)), active };
  });
}

function merge(db, groups) {
  const before = Object.fromEntries(['bookings','payments','agreements','viewing_appointments','maintenance_tickets','invoices','reviews'].map(table=>[table,db.prepare(`SELECT count(*) n FROM ${table}`).get().n]));
  db.transaction(()=>{
    for (const group of groups) {
      const target = group.keep.id;
      for (const row of group.remove) {
        for (const table of ['bookings','invoices','viewing_appointments','maintenance_tickets','reviews','amenities']) db.prepare(`UPDATE ${table} SET propertyId=? WHERE propertyId=?`).run(target,row.id);
        for (const [table,key] of [['agent_properties','agentId'],['favorites','userId']]) {
          db.prepare(`DELETE FROM ${table} WHERE propertyId=? AND ${key} IN (SELECT ${key} FROM ${table} WHERE propertyId=?)`).run(row.id,target);
          db.prepare(`UPDATE ${table} SET propertyId=? WHERE propertyId=?`).run(target,row.id);
        }
        const images = db.prepare('SELECT * FROM property_images WHERE propertyId=? ORDER BY sortOrder,id').all(row.id);
        let sort = db.prepare('SELECT coalesce(max(sortOrder),-1)+1 n FROM property_images WHERE propertyId=?').get(target).n;
        for (const image of images) {
          const duplicate = db.prepare('SELECT id FROM property_images WHERE propertyId=? AND url=? AND type=?').get(target,image.url,image.type);
          if (duplicate) db.prepare('DELETE FROM property_images WHERE id=?').run(image.id);
          else db.prepare('UPDATE property_images SET propertyId=?,sortOrder=? WHERE id=?').run(target,sort++,image.id);
        }
        for (const field of ['videoUrls','documentUrls']) {
          const current = db.prepare(`SELECT ${field} value FROM properties WHERE id=?`).get(target).value;
          const parse = value=>value ? JSON.parse(value) : [];
          if (row[field]) db.prepare(`UPDATE properties SET ${field}=? WHERE id=?`).run(JSON.stringify([...new Map([...parse(current),...parse(row[field])].map(item=>[JSON.stringify(item),item])).values()]),target);
        }
        db.prepare('DELETE FROM properties WHERE id=?').run(row.id);
      }
      db.prepare('UPDATE properties SET catalogueOrder=? WHERE id=?').run(group.order,target);
      if (group.active.length) db.prepare("UPDATE properties SET status='RENTED' WHERE id=?").run(target);
      const rating = db.prepare('SELECT count(*) n,avg(rating) rating FROM reviews WHERE propertyId=?').get(target);
      if (rating.n) db.prepare('UPDATE properties SET reviewsCount=?,rating=? WHERE id=?').run(rating.n,rating.rating,target);
    }
    for (const [table,count] of Object.entries(before)) if (db.prepare(`SELECT count(*) n FROM ${table}`).get().n!==count) throw Error(`Record count changed: ${table}`);
    if (db.pragma('foreign_key_check').length) throw Error('Foreign key validation failed');
    if (db.pragma('integrity_check',{simple:true})!=='ok') throw Error('Database integrity check failed');
  })();
  return {groups:groups.length,removed:groups.reduce((n,g)=>n+g.remove.length,0),remaining:db.prepare('SELECT count(*) n FROM properties').get().n,recordsPreserved:before,mapping:groups.map(g=>({title:g.keep.title,keep:g.keep.id,ownerId:g.keep.ownerId,removed:g.remove.map(r=>r.id)}))};
}

async function main() {
  const apply = process.argv.includes('--apply');
  const fileArg = process.argv.find(a=>a.startsWith('--database='));
  const file = fileArg ? fileArg.slice('--database='.length) : path.resolve(__dirname,'../prisma/dev.db');
  const db = new Database(file,{readonly:!apply});
  db.pragma('foreign_keys=ON');
  try {
    const groups = plan(db);
    const directory = path.resolve(__dirname,'../../.artifacts/property-deduplication');
    let backup;
    if (apply) {
      fs.mkdirSync(directory,{recursive:true});
      backup = path.join(directory,`before-${Date.now()}.db`);
      await db.backup(backup);
    }
    const result = apply ? merge(db,groups) : {groups:groups.length,mapping:groups.map(g=>({title:g.keep.title,keep:g.keep.id,removed:g.remove.map(r=>r.id)}))};
    result.backup = backup;
    if (apply) fs.writeFileSync(path.join(directory,`result-${Date.now()}.json`),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));
  } finally { db.close(); }
}
module.exports={plan,merge};
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1});
