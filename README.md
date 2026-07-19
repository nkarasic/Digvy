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

The Supabase schema lives in `supabase-migration.sql`, `supabase-migration-002-dates.sql`, and `supabase-migration-003-email-prefs.sql`; run them in the Supabase SQL Editor when setting up a new project, in that order.

## Architecture notes

- `server/app.js` builds the Express app; `server/index.js` is the local entry (`listen`), and `api/index.js` exports the same app as the Vercel function. A rewrite in `vercel.json` sends all `/api/*` traffic to it.
- All API routes require a Supabase JWT (`Authorization: Bearer`). Auth flows (signup, login, refresh, password reset) happen client-side via supabase-js — the server never sees passwords.
- Multi-tenant: every row carries `user_id`, enforced by RLS and scoped again in every server query.
- CSV import is two-phase: upload → preview/triage screen → confirm.

## Email digests

A daily Vercel Cron job (`vercel.json` → `GET /api/digest/run`, 13:00 UTC) emails each user a digest of their overdue and due-within-7-days items via [Resend](https://resend.com). Snoozed and evergreen items are excluded. The endpoint is protected by `CRON_SECRET` (Vercel sends it as `Authorization: Bearer`, per its cron docs) and fails closed if the secret is unset.

Preferences: users without an `email_preferences` row are subscribed by default; the digest job creates the row (with an unsubscribe token) on first send. Every email carries a one-click unsubscribe link (`GET /api/email/unsubscribe?token=…`), and the authed `GET`/`PUT /api/email/preferences` endpoints exist for an in-app toggle.

Environment variables: `RESEND_API_KEY` (required to send), `CRON_SECRET` (required), `EMAIL_FROM` (optional; defaults to Resend's onboarding sender, which only delivers to the account owner until a domain is verified), `APP_URL` (optional; defaults to https://digvy.vercel.app, used for links in the email).

Local triggers:

```
npm run digest -- --dry-run    # print each user's rendered digest, send nothing
npm run digest                 # send for real (needs RESEND_API_KEY in .env)
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3001/api/digest/run?dry=1"
```

## Deployment

Pushes to `main` auto-deploy to Vercel. The project needs these environment variables in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` (mark the service role key, Resend key, and cron secret Sensitive). The client is built to `client/dist` and served statically; only `/api/*` invokes the function.
