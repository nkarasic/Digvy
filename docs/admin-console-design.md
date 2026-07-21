# Admin / Customer-Service Console — Design Doc

_Status: Draft · Last updated: 2026-07-20 · Owner: Neal_

## 1. Purpose

Digvy today is a strictly single-tenant experience: `requireAuth` verifies a
Supabase JWT, sets `req.userId`, and every query is scoped to that user by Row
Level Security. There is **no way for an operator to see or act on another
user's account** — which is fine until the first "my digest didn't arrive"
support email.

This console adds an operator surface for two jobs:

1. **Support** — look up a user, understand their account state, and diagnose
   the common failures (digest not received, item won't advance, can't log in).
2. **Administration** — user lifecycle (suspend/delete/reset), fleet-wide
   metrics, and a defensible audit trail of every operator action.

The one place the codebase already reaches across users is the digest job
(`server/services/digestService.js`), which uses the **service-role client** to
bypass RLS and `supabase.auth.admin.getUserById()` to resolve emails. The
console generalizes that seam behind a proper authorization gate.

## 2. Access model

### Recommendation: design for three tiers, deploy one

Ship a single `role` column that understands `user` / `support` / `admin`, but
only populate `admin` (just you) at launch. This is "design for two, deploy
one" — the schema, middleware, and audit log all understand tiers from day one,
so adding a support hire later is a data change, not a refactor. You avoid both
over-building UI you don't need yet and the painful retrofit of bolting
granular permissions onto a binary system.

Tier capabilities (enforced server-side):

| Capability | support | admin |
|---|:---:|:---:|
| View users, items, logs, metrics | ✅ | ✅ |
| View audit log | ✅ | ✅ |
| Resend digest (dry-run + real) | ✅ | ✅ |
| Toggle a user's email preference | ✅ | ✅ |
| Trigger password-reset email | ✅ | ✅ |
| Suspend / unsuspend a user | ❌ | ✅ |
| Delete a user + their data | ❌ | ✅ |
| Bulk operations | ❌ | ✅ |

### Mechanism

- New table (see §3) carrying the role, OR Supabase `app_metadata.role` custom
  claim. **Recommendation: a DB column** — it's queryable, easy to change from
  SQL, and avoids re-issuing tokens. The claim approach is "more correct" but
  fiddlier to mutate; not worth it at this scale.
- New middleware `requireAdmin(minRole)` that runs **after** `requireAuth`,
  reads the caller's role, and 403s if below `minRole`. Default `minRole` is
  `support`; destructive routes pass `admin`.
- Admin routes use the **service-role client** (deliberate RLS bypass), and are
  mounted on a physically separate `/api/admin/*` router so privileged code is
  obvious in review.
- Client gating is **cosmetic only** — the `/admin` UI hides itself for
  non-operators, but the server middleware is the real boundary.

### Guardrails

- **Every write is audited** (§3). No exceptions — this is a CS tool acting on
  customer accounts.
- Destructive actions (delete, suspend) require a typed confirmation in the UI
  and re-check `admin` server-side.
- An admin cannot delete or demote their own account via the console (prevents
  lockout / footguns).

## 3. Data model changes

```sql
-- Operator roles. Absence of a row = ordinary user (no console access).
create table admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('support', 'admin')),
  created_at timestamptz not null default now()
);

-- Append-only record of every operator write action.
create table admin_audit (
  id             bigint generated always as identity primary key,
  actor_id       uuid not null references auth.users(id),
  action         text not null,               -- e.g. 'digest.resend'
  target_user_id uuid,                         -- subject of the action, if any
  payload        jsonb,                        -- action-specific detail
  created_at     timestamptz not null default now()
);
create index on admin_audit (target_user_id, created_at desc);
create index on admin_audit (actor_id, created_at desc);

-- Persist digest runs so support can answer "why no email?".
create table digest_runs (
  id          bigint generated always as identity primary key,
  ran_at      timestamptz not null default now(),
  dry_run     boolean not null default false,
  sent        int not null default 0,
  skipped     int not null default 0,
  errors      int not null default 0,
  detail      jsonb                            -- the runDigest() results object
);
```

- Both `admin_users` and `admin_audit` are **service-role only** — add RLS
  policies that deny all access to the `authenticated` role so a leaked anon/JWT
  path can never read them.
- `digest_runs` is populated by extending `runDigest()` to persist its existing
  `{ sent, skipped, errors }` return value.
- Suspension: prefer Supabase's native `ban_duration` via the auth admin API
  over a homegrown flag, so a suspended user genuinely can't get a token.

## 4. API surface

New router `server/routes/admin/` mounted at `/api/admin`, entirely behind
`requireAuth` + `requireAdmin`.

| Method & path | Min role | Purpose |
|---|:---:|---|
| `GET /admin/metrics` | support | Fleet totals: users, active items, logs, 24h digest sends, email failures |
| `GET /admin/users?q=` | support | Search/list users by email; returns summary rows |
| `GET /admin/users/:id` | support | Full detail: identity, prefs, item/log counts |
| `GET /admin/users/:id/items` | support | Read-only item list (reuse item shape) |
| `GET /admin/users/:id/logs` | support | Read-only log list |
| `POST /admin/users/:id/digest` | support | Resend digest; `{ dryRun: bool }` |
| `PATCH /admin/users/:id/preferences` | support | Toggle `digest_enabled` on their behalf |
| `POST /admin/users/:id/password-reset` | support | Trigger Supabase reset email |
| `POST /admin/users/:id/suspend` | admin | Ban/unban via auth admin API |
| `DELETE /admin/users/:id` | admin | Delete auth user + cascade their rows |
| `GET /admin/digest-runs` | support | Recent runs + per-user send/skip/error |
| `GET /admin/audit` | support | Paginated audit stream |

Conventions:
- User identity fields (email, created_at, last_sign_in_at, confirmed,
  banned_until) come from `auth.admin.listUsers` / `getUserById`, not from a
  local table.
- Every mutating handler writes an `admin_audit` row **in the same request**,
  after the action succeeds.
- Reuse existing zod validation (`server/middleware/validate.js`) for bodies.

## 5. Screens

### 5.1 Dashboard / fleet overview
Metric tiles (users, active items, logs, digests sent 24h, email failures) +
recent digest-run summary. Backed by `GET /admin/metrics` and
`GET /admin/digest-runs`. Aggregate queries are new but mirror the per-user
math already in `statsService`.

### 5.2 User search & list
Single search box (email), results table: email · signed up · last active ·
item count · digest on/off. Row → user detail.

### 5.3 User detail — the CS workhorse
- **Identity panel**: email, created, last sign-in, email-confirmed, ban status.
- **Items & logs**: read-only tables reusing the existing item/log rendering.
- **Email panel**: digest enabled?, unsubscribe token, and **"Send test digest
  to this user"** (dry-run preview + real send) — a per-user variant of the
  existing `runDigest({ dryRun })`.
- **Actions** (each audited): toggle digest pref · trigger password reset ·
  suspend/unsuspend (admin) · delete account (admin, typed confirm).

### 5.4 Email / digest ops
Recent digest runs with per-user send/skip/error breakdown — directly answers
the top support question. Data already exists in `runDigest`'s return value;
this screen just needs it persisted (§3) and surfaced.

### 5.5 Audit log viewer
Read-only, filterable by actor / target / action. The trust backbone of the
whole console.

### Client integration
A gated `/admin` area in the existing HashRouter app, rendered only when the
signed-in user's role is `support`/`admin`. Fetch role once at login (e.g. a
`GET /admin/whoami` or fold into existing bootstrap). Reuse existing layout,
table, and toast components.

## 6. Phasing

1. **Foundation (no UI)** — `admin_users` + `admin_audit` tables, `requireAdmin`
   middleware, `/api/admin` skeleton, seed yourself as `admin`. Verify with
   curl. Zero user-facing risk.
2. **Read-only console** — metrics, user search, user detail, item/log views,
   audit viewer. Immediately useful for support; nothing is mutable. **DONE.**
   Backend: `getMetrics`/`listUsers`/`getUserDetail`/`getUserItems`/
   `getUserLogs`/`listAudit` in `adminService.js`, exposed as `GET /admin/*`.
   Client: gated `/admin` routes (`AdminGate` + `useOperatorRole`),
   `AdminDashboardPage`, `AdminUserDetailPage`, `AdminAuditPage`, and an
   operator-only link in Settings.
3. **Safe actions** — per-user digest resend, preference toggle, password-reset
   trigger. All reversible, all audited. Persist `digest_runs` here. **DONE.**
   Migration `supabase-migration-005-digest-runs.sql`. `digestService` refactored
   to extract per-user send (`runDigestForUser`) and persist every run.
   `adminService`: `resendDigest`, `setUserDigestEnabled`, `sendPasswordReset`,
   `listDigestRuns`; `getMetrics` gains 24h send/error counts (degrades to 0 pre-
   migration). Routes: `POST /admin/users/:id/digest`, `PATCH .../preferences`,
   `POST .../password-reset`, `GET /admin/digest-runs`. Client: Actions section on
   user detail (preview modal, send, toggle, reset), `AdminDigestRunsPage`, digest
   tile + link on dashboard.
4. **Destructive / admin-only** — suspend, delete, bulk ops. Extra confirmation,
   `admin` tier enforced, heavily audited.

## 7. Open questions / risks

- **Serverless rate limiting** is in-memory and per-instance (see `app.js`) — a
  brute-force guard on `/api/admin` should not rely on it; consider a stricter,
  separate limiter or IP allow-list for admin routes.
- **PII exposure**: the console reads other users' items/logs, which may contain
  personal notes. Decide whether support sees full item `details` or a redacted
  view, and note it in your privacy policy.
- **Delete semantics**: hard-delete vs. soft-delete + retention window. Hard
  delete is simpler but irreversible; a 30-day soft delete is friendlier and
  matches the "confirm before destroying" guardrail.
- **Bootstrapping the first admin**: done once via SQL insert, not through the
  console (chicken-and-egg). Document it in the runbook.
