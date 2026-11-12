# PRMS MySQL setup

The main project now uses MySQL through `DATABASE_URL`. SQLite `dev.db` is an archived source and is not used by the application. The earlier optional-provider preparation was saved privately under `.artifacts/previous-mysql-preparation` before integrating commit 8969337. No historical SQLite data is imported by the fresh setup.

## This computer

MySQL Server 8.4 is installed, listening only at `127.0.0.1:3307`, with database `prms_local`. Connection credentials are stored in the private backend `.env`. MySQL runs as a process rather than an installed Windows service.

From `prms-backend`:

```cmd
npm run mysql:start
npm run dev
```

In another terminal, from `prms-frontend`:

```cmd
npm run dev
```

Run `mysql:start` after restarting Windows. `mysql:status` checks the database; `mysql:stop` shuts it down cleanly after stopping the backend. These three helper commands are specific to the local Windows installation. Its server data/configuration/credentials are inside the ignored root `.artifacts/local-mysql` folder. Do not delete or commit that folder. If the project moves, update the absolute paths in its private `my.ini`.

## Another computer or hosted MySQL

Install Node.js 24 and provision a dedicated MySQL 8 database and user. Copy `prms-backend/.env.example` to `.env`, set strong JWT secrets and a private connection URL:

```dotenv
DATABASE_URL="mysql://USER:URL_ENCODED_PASSWORD@HOST:PORT/DATABASE"
MYSQL_SSL=false
```

For a hosted connection requiring TLS, set `MYSQL_SSL=true`. If the provider supplies a CA, save it privately and set `MYSQL_SSL_CA` to its file path. TLS verification is never disabled. The URL's host, port and credentials must be identical for Prisma and the running app. Never commit credentials or put them in frontend environment variables.

Backend first-time setup:

```cmd
npm ci
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Seeding is optional demo data, not a data migration. It creates the four demo accounts and sample listings and preserves existing passwords. Do not use demo credentials on a public production system. Frontend first-time setup is `npm ci`, then `npm run dev`.

For an existing database that only needs the default shared categories, run `npm run categories:seed`. This adds missing defaults without reseeding properties or changing passwords.

If MySQL tables were previously created using `prisma db push`, back up that database before adopting the new migration history. Do not reset it or mark the initial migration as applied blindly. Compare its schema with this migration, reconcile differences, and baseline the migration history after review. The first-time commands above assume an empty database.

## Schema updates and deployment

The canonical schema is `prms-backend/prisma/schema.prisma`; MySQL migrations are in `prisma/migrations`. Run `prisma migrate dev --name DESCRIPTIVE_NAME` only on a development database when authoring a schema change. Commit the generated migration. Apply it elsewhere with `npm run prisma:deploy` before restarting the backend. Never reset a populated shared database.

`npm ci` generates the Prisma client. `npm run prisma:generate` can regenerate it explicitly, and `npm run build` builds the backend. Startup checks connectivity and schema readiness only: it never pushes a schema or resets/reactivates the Admin account.

Properties and audit filters use the MySQL database's case-insensitive collation. Long content, tokens, URLs, terms and audit payloads use native LONGTEXT to avoid the default short-string limit.

## Files and backups

MySQL stores image URLs/paths, not uploaded file bytes. Uploaded files remain under the local backend folders. A shared database alone does not share these files; shared object storage is a separate hosting step. A Git clone contains neither MySQL records nor ignored uploads. Each standalone database needs its own initialization or a backup import.

Keep database and upload backups separately. Legacy catalogue/deduplication utilities target SQLite backups and are guarded while MySQL is configured. They are not MySQL import tools. The old SQLite database was preserved privately before this update.
