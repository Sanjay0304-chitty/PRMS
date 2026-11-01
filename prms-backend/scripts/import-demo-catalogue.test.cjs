const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { syncCatalogue } = require('./import-demo-catalogue.cjs');

function fixture() {
  const db = new Database(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,is_active INTEGER);
    INSERT INTO users VALUES('john','landlord@prms.com',1),('other','other@example.test',1);
    CREATE TABLE properties(id TEXT PRIMARY KEY,title TEXT,address TEXT,ownerId TEXT,rent REAL,status TEXT,catalogueOrder INTEGER DEFAULT 2147483647);
    INSERT INTO properties(id,title,address,ownerId,rent,status) VALUES('demo','Demo','A','other',1200,'AVAILABLE'),('protected','Protected','B','other',1500,'RENTED'),('extra','Extra','C','other',900,'AVAILABLE');
    CREATE TABLE property_images(id TEXT PRIMARY KEY,propertyId TEXT REFERENCES properties(id),url TEXT,type TEXT,sortOrder INTEGER DEFAULT 0);
    INSERT INTO property_images VALUES('original','demo','/uploads/original.jpg','image',0),('video','demo','/uploads/tour.mp4','video',0);
    CREATE TABLE bookings(id TEXT,propertyId TEXT); INSERT INTO bookings VALUES('booking','protected');
    CREATE TABLE viewing_appointments(propertyId TEXT);
    CREATE TABLE maintenance_tickets(propertyId TEXT);
    CREATE TABLE agent_properties(propertyId TEXT);`);
  const catalogue={version:1,properties:[{id:'protected',title:'Protected',address:'B',order:0,assignToJohn:true,images:[{url:'https://example.test/protected.jpg'}]},
    {id:'demo',title:'Demo',address:'A',order:1,assignToJohn:true,images:[{url:'https://example.test/first.jpg'},{url:'https://example.test/second.jpg'}]}]};
  return {db,catalogue};
}
test('imports ordered photos and transfers only unencumbered demo properties',()=>{
  const {db,catalogue}=fixture();
  const result=syncCatalogue(db,catalogue,true);
  assert.equal(result.insertedImages,3);assert.equal(result.ownershipTransfers.length,1);assert.equal(result.protectedOwners.length,1);
  assert.equal(db.prepare('SELECT ownerId FROM properties WHERE id=?').get('demo').ownerId,'john');
  assert.equal(db.prepare('SELECT ownerId FROM properties WHERE id=?').get('protected').ownerId,'other');
  assert.deepEqual(db.prepare('SELECT id FROM properties ORDER BY catalogueOrder,id DESC').all().map(p=>p.id),['protected','demo','extra']);
  const photos=db.prepare("SELECT url FROM property_images WHERE propertyId='demo' ORDER BY sortOrder").all().map(p=>p.url);
  assert.deepEqual(photos,['https://example.test/first.jpg','https://example.test/second.jpg','/uploads/original.jpg','/uploads/tour.mp4']);
  assert.equal(db.prepare('SELECT rent FROM properties WHERE id=?').get('demo').rent,1200);
  assert.equal(db.prepare('SELECT count(*) n FROM bookings').get().n,1);db.close();
});
test('repeated import is idempotent and preserves existing media IDs',()=>{
  const {db,catalogue}=fixture();syncCatalogue(db,catalogue,true);
  const before=db.prepare('SELECT * FROM property_images ORDER BY id').all();
  const report=syncCatalogue(db,catalogue,true);
  assert.equal(report.insertedImages,0);assert.deepEqual(db.prepare('SELECT * FROM property_images ORDER BY id').all(),before);db.close();
});
test('preview does not alter properties or images',()=>{
  const {db,catalogue}=fixture();const before=db.serialize();syncCatalogue(db,catalogue,false);assert.deepEqual(db.serialize(),before);db.close();
});
test('property identity mismatches abort the entire operation',()=>{
  const {db,catalogue}=fixture();catalogue.properties[1].address='Wrong address';
  assert.throws(()=>syncCatalogue(db,catalogue,true),/identity mismatch/);
  assert.equal(db.prepare('SELECT count(*) n FROM property_images').get().n,2);db.close();
});
test('agent assignments and viewing history protect ownership transfers',()=>{
  for(const table of ['agent_properties','viewing_appointments','maintenance_tickets']){
    const {db,catalogue}=fixture();db.prepare(`INSERT INTO ${table} VALUES(?)`).run('demo');
    const result=syncCatalogue(db,catalogue,true);assert.equal(result.ownershipTransfers.length,0);
    assert.equal(db.prepare('SELECT ownerId FROM properties WHERE id=?').get('demo').ownerId,'other');db.close();
  }
});
