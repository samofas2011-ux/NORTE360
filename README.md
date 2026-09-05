# Norte360

Norte360 is a financial decision and navigation web app for consumers and households, initially focused on Costa Rica.

Core idea: **El Waze de tus finanzas**. Users describe where they are financially and where they want to go; Norte360 compares routes and explains the tradeoffs.

## v0.1 Scope

- Public sales website
- Protected Next.js application shell
- Create account and login flow
- Backend auth API with bcrypt password hashing and httpOnly session cookies
- Postgres-ready user/session persistence through `DATABASE_URL`
- Mi Panorama dashboard with Norte Score
- Mi Norte goal definition surface
- Mis Rutas scenario comparison
- Decision Lab starter simulator
- Advisor explanation grounded in deterministic calculations
- Financial engine module with unit tests

## Local Development

```bash
npm install
npm run dev
```

## Database Setup

Norte360 expects a managed Postgres database in `DATABASE_URL`.

1. Create a Neon, Supabase, Prisma Postgres, or other managed Postgres database.
2. Add `DATABASE_URL` to `.env.local` for local development.
3. Add `DATABASE_URL` to the Vercel project for Production and Preview.
4. Run the SQL in `sql/auth-schema.sql`, or let the auth API create the tables on first register/login.

Passwords are stored as bcrypt hashes. Session cookies are httpOnly, sameSite=lax,
secure in production, and backed by revocable session rows.

## Verification

```bash
npm test
npm run build
```

## Deployment

The project is linked to Vercel as `norte-360/norte360`.

Production domains:

- https://tunorte360.com
- https://www.tunorte360.com
