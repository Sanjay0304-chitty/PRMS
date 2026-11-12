# PRMS - Property Rental Management System

PRMS uses React with Vite, an Express/TypeScript backend, Prisma and MySQL. The frontend runs at http://localhost:5173 and the backend at http://localhost:3500.

## Requirements

- Node.js 24 and npm
- A running MySQL 8 database with a dedicated application user

## Backend

Copy `prms-backend/.env.example` to `prms-backend/.env`. Set `DATABASE_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET` privately. Then, from `prms-backend`:

```cmd
npm ci
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

The seed command is optional demo setup. Run it once on a new development database; it is not required for every startup. Existing account passwords are preserved. Do not delete the lock files or reset a shared database.

On the configured local Windows computer, run `npm run mysql:start` before starting the backend after a Windows restart. Other computers need their own MySQL service or an approved hosted connection. See [MySQL setup](docs/MYSQL_MIGRATION.md).

## Frontend

From `prms-frontend`:

```cmd
npm ci
npm run dev
```

## Development demo accounts

| Role | Email | Initial password |
|---|---|---|
| Admin | admin@prms.com | Admin123! |
| Landlord | landlord@prms.com | Landlord123! |
| Tenant | tenant@prms.com | Tenant123! |
| Agent | agent@prms.com | Agent123! |

These are demonstration credentials. Replace them before any public deployment. Restarting the backend does not reset passwords.

## Verification

Backend: `npm test` and `npm run build`.
Frontend: `npm run lint` and `npm run build`.

## Collaboration and storage

Use feature branches and review changes before merging into main. Keep `.env`, database backups, uploads, `node_modules` and Visual Studio workspace files out of Git. A clone copies code, not the database or ignored uploaded files. MySQL holds image links; local upload files must be copied separately or placed in shared online storage. Hostinger deployment and shared image storage are separate from this local MySQL setup.
