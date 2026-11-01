# Demo property catalogue

The catalogue snapshot in `prms-backend/prisma/data/demo-catalogue.json` contains 198 properties after duplicate cleanup. It provides display order and HTTPS photo links from the reference project. Images require internet access.

From the backend directory, apply the schema migration once after updating the code:

```powershell
npx prisma migrate deploy
```

Preview the import, then apply it once:

```powershell
npm run demo:catalogue
npm run demo:catalogue -- --apply
```

The importer makes a database backup before applying changes. Repeating it does not duplicate photos. Normal startup remains `npm run dev`; the import is not needed on each startup.

The initial import on 1 November 2026 preserved 238 properties. The subsequent duplicate cleanup consolidated 37 extra copies in 18 groups, leaving 201 properties. John Landlord's listing was kept in each duplicate group; his resulting portfolio contains 168 properties. The three local-only listings remain at the end.

Bookings, payments, agreements, invoices, maintenance, reviews and viewings were preserved, with property references redirected where necessary. Agent assignments and favorites were carried over; identical memberships were combined. Distinct pictures, videos and documents were retained. Repeated photo URLs within merged listings were combined. The retained listing supplies rent and other details; active tenancies mark that property as Rented. Historical agreement terms and payment amounts were not rewritten.

The duplicate seed entries were removed from the apartment and Malaysia listing datasets, and the catalogue was consolidated, so those imports do not recreate the removed copies.

For an existing database, preview the reconciliation before applying it:

```powershell
node scripts/deduplicate-properties.cjs
node scripts/deduplicate-properties.cjs --apply
```

The script backs up the database, prioritises John Landlord, and rejects conflicting active tenancies or signed agreements that would move between owners. It matches name, address and city, so separate units must have distinct unit addresses. The local backup and mapping report are under `.artifacts/property-deduplication/`. No separate-unit decision should be made solely from a shared building address.

Photo ordering is stored explicitly. Cards and the main gallery try another picture from the same property when an external cover image fails. Existing videos and documents remain separate from editable photos.

The original database and media backup is recorded in the local ignored file `.artifacts/property-demo-sync-current.json`. Do not replace another developer's database with the reference database; use the targeted importer and review its preview instead.
