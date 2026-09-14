# PRMS - Property Rental Management System

How To Start

----------------------------------
windows
----------------------------------
rmdir /s /q node_modules
del package-lock.json
npm install
npm rebuild
npx prisma generate
npx prisma db push
npm run dev

----------------------------------
Linux
----------------------------------
rm -rf node_modules
rm package-lock.json
npm install
npm rebuild
npx prisma generate
npx prisma db push
npm run dev

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | TypeScript, Express.js, Prisma ORM, SQLite, bcryptjs, jsonwebtoken, validator |
| **Frontend** | Next.js (React), React Router, Axios, React Hook Form, Recharts |
| **Database** | SQLite (development) |
| **Auth** | JWT-based authentication with bcryptjs password hashing |

## Project Structure

```
ProjectA/
├── prms-backend/       # Express + TypeScript + Prisma backend (port 3500)
│   ├── src/
│   │   ├── app.ts               # Express app configuration
│   │   ├── index.ts             # Server entry point
│   │   ├── config.ts            # Environment configuration
│   │   ├── middleware/          # Auth, RBAC, error handling
│   │   ├── routes/              # Route aggregation
│   │   └── modules/             # Feature modules (auth, user, property, booking, etc.)
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema with enums
│   │   └── seed.ts              # Database seeder
│   ├── .env                     # Environment variables
│   └── package.json
├── prms-frontend/      # Next.js frontend (port 3000)
│   ├── src/
│   │   ├── api/                 # API client + endpoint wrappers
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth, Theme, Toast)
│   │   ├── layout/              # App layout + navigation
│   │   ├── lib/                 # Utility functions
│   │   ├── pages/               # Page components
│   │   └── services/            # API services
│   ├── .env.local               # Frontend env variables
│   └── package.json
└── Tasks.txt              # Task tracker
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

---

## Backend Setup & Startup

### 1. Install dependencies

```bash
cd prms-backend
npm install
```

### 2. Configure environment

The `.env` file is already included with default values:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3500
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

Change `JWT_SECRET` to a strong random value in production.

### 3. Push database schema & seed

```bash
# Push schema to SQLite (creates/updates tables)
npx prisma db push

# Generate Prisma client types
npx prisma generate

# Seed the database with default data
npx tsx prisma/seed.ts
```

### 4. Start the server

```bash
# Development mode (hot-reload with tsx watch)
npm run dev

# Alternative: one-off start
npm start
```

The backend server starts on **http://localhost:3500** in development mode.

```
[Firebase] Running without credential (local mode)
PRMS Backend running on http://localhost:3500 (development)
```

### 5. Verify

```bash
# Health check
curl http://localhost:3500/health

# Test login (seeded admin account)
curl -X POST http://localhost:3500/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@prms.com","password":"Admin123!"}'
```

---

## Frontend Setup & Startup

### 1. Install dependencies

```bash
cd prms-frontend
npm install
```

### 2. Configure environment

Ensure `.env.local` contains the correct API base URL:

```env
VITE_API_BASE_URL=http://localhost:3500
```

### 3. Start the dev server

```bash
npm run dev
```

The frontend starts on **http://localhost:3000**.

### 4. Build for production

```bash
npm run build
npm run start
```

---

## Seeded Accounts

After running `npx tsx prisma/seed.ts`, the following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@prms.com | Admin123! |
| Landlord | landlord@prms.com | Landlord123! |
| Tenant | tenant@prms.com | Tenant123! |

---

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/login` | User login |
| POST | `/auth/register` | Register new user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/logout` | Logout (invalidate refresh token) |
| GET | `/users` | List users (Admin only) |
| GET | `/users/:id` | Get user by ID |
| PATCH | `/users/:id/deactivate` | Deactivate user (Admin only) |
| GET | `/properties` | List / search properties |
| POST | `/properties` | Create property (Landlord only) |
| PUT | `/properties/:id` | Update property (Landlord only) |
| POST | `/properties/:id/images` | Add property image |
| GET | `/properties/reporting` | Property statistics (Admin only) |
| POST | `/bookings/:id/confirm` | Confirm booking (Landlord only) |
| POST | `/bookings/:id/check-in` | Check-in (Landlord only) |
| POST | `/bookings/:id/checkout` | Check-out (Landlord only) |
| GET | `/reports` | Reporting endpoints (Admin only) |

---

## Database Schema (Enums)

| Model | Status Enum Values |
|-------|--------------------|
| Property | AVAILABLE, RENTED, MAINTENANCE, INACTIVE |
| Booking | PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED |
| Payment | UNPAID, PENDING, PAID, FAILED, REFUNDED |
| Maintenance | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| Maintenance Priority | LOW, MEDIUM, HIGH, URGENT |

---

## License

MIT
