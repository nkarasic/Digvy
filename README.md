# Digvy

A web app for managing infrequent life events — recurring maintenance, subscriptions, appointments, renewals, and one-time reference records. The dashboard surfaces what needs action (overdue, due soon, cancel-by deadlines) and keeps a searchable history of everything else.

**Live:** https://digvy.vercel.app

## Stack

- **Frontend:** React (Vite), Tailwind CSS v4, React Router (hash routing)
- **Backend:** Express, deployed as a single Vercel serverless function
- **Database & auth:** Supabase (PostgreSQL with Row Level Security, supabase-js auth on the client, JWT verification on the server)

## Local development

Requires Node 20+.

1. Create a `.env` at the project root:

   ```
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

   The Vite build injects only the URL and anon key into the client bundle; the service role key stays server-side.

2. Install and run:

   ```
   npm install        # also installs client deps via postinstall
   npm run dev        # Express on :3001, Vite on :5173 (proxies /api)
   ```

   Open http://localhost:5173. To use from a phone on the same network, open `http://<your-machine-ip>:5173`.

3. Tests: `npm test` (also run in CI).

The Supabase schema lives in `supabase-migration.sql` and `supabase-migration-002-dates.sql`; run them in the Supabase SQL Editor when setting up a new project, in that order.

## Architecture notes

- `server/app.js` builds the Express app; `server/index.js` is the local entry (`listen`), and `api/index.js` exports the same app as the Vercel function. A rewrite in `vercel.json` sends all `/api/*` traffic to it.
- All API routes require a Supabase JWT (`Authorization: Bearer`). Auth flows (signup, login, refresh, password reset) happen client-side via supabase-js — the server never sees passwords.
- Multi-tenant: every row carries `user_id`, enforced by RLS and scoped again in every server query.
- CSV import is two-phase: upload → preview/triage screen → confirm.

## Deployment

Pushes to `main` auto-deploy to Vercel. The project needs three environment variables in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (mark the service role key Sensitive). The client is built to `client/dist` and served statically; only `/api/*` invokes the function.
