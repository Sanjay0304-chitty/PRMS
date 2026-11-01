const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Database=require('better-sqlite3');
const {plan}=require('./deduplicate-properties.cjs');
function fixture(){
 const db=new Database(':memory:');
 db.exec(`CREATE TABLE users(id TEXT,email TEXT); INSERT INTO users VALUES('john','landlord@prms.com');
 CREATE TABLE properties(id TEXT,title TEXT,address TEXT,city TEXT,ownerId TEXT,catalogueOrder INTEGER);
 INSERT INTO properties VALUES('first','Apartment','A','City','other',0),('john-copy','Apartment','A','City','john',10);
 CREATE TABLE bookings(id TEXT,propertyId TEXT,status TEXT,start_date TEXT,end_date TEXT);
 CREATE TABLE agreements(bookingId TEXT,landlordSignedAt TEXT,physicalVerifiedAt TEXT);`);
 return db;
}
test('John listing takes priority over a higher catalogue position',()=>{
 const db=fixture();const groups=plan(db);
 assert.equal(groups[0].keep.id,'john-copy');assert.equal(groups[0].order,0);db.close();
});
test('different names at a shared address are not merged',()=>{
 const db=fixture();db.exec("UPDATE properties SET title='Different unit' WHERE id='first'");assert.equal(plan(db).length,0);db.close();
});
test('overlapping active tenancies block the merge',()=>{
 const db=fixture();db.exec("INSERT INTO bookings VALUES('a','first','CHECKED_IN','2026-01-01','2027-01-01'),('b','john-copy','CONFIRMED','2026-06-01','2027-06-01')");
 assert.throws(()=>plan(db),/Conflicting tenancies/);db.close();
});
test('signed agreements block moving a tenancy between owners',()=>{
 const db=fixture();db.exec("INSERT INTO bookings VALUES('a','first','CHECKED_IN','2026-01-01','2027-01-01'); INSERT INTO agreements VALUES('a','2026-01-01',NULL)");
 assert.throws(()=>plan(db),/Signed agreement requires review/);db.close();
});
test('cleaned import datasets contain no repeated name/address/city',()=>{
 const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 for(const filename of ['demo-catalogue.json','propertydata_apartments.json','malaysia_listings.json']){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../prisma/data',filename),'utf8'));
  const rows=data.properties||data;
  const keys=rows.map(row=>[row.title,row.address,row.city].map(norm).join('|'));
  assert.equal(new Set(keys).size,keys.length,filename);
 }
});
