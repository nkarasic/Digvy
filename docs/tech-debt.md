# Tech Debt

_Status: Living doc · Last updated: 2026-07-22 · Owner: Neal_

A running list of known, deliberately-deferred debt. Each item says what the
gap is, why it matters, and a sketch of the fix, so a future session can pick it
up without re-deriving the context.

---

## 1. Database-touching services have no test coverage

**Status:** Open · Logged 2026-07-21

### The gap

The test suite (`server/tests/`) only covers **pure functions** — anything that
touches Supabase is untested, because there's no way to run the DB layer in
tests. The implicit rule today is "if it calls `supabase`, it isn't tested."

Tested: `urgencyService` (`computeUrgency`), `csvParser`, `dateHelpers`,
`digestBuilder`, and `statsService.computeSpendByCategory` (the pure part,
extracted 2026-07-21).

Untested and DB-touching:

- **`logService.addLog`** — the `set_next` vs. legacy Interval auto-advance
  branching. A bug here reschedules items wrong.
- **`adminService`** — suspend / delete / reset users. Security-sensitive and
  completely uncovered.
- **`itemService`** — CRUD + urgency enrichment.
- **`statsService`** — `getUpcomingCosts`, `getSubscriptionSummary`,
  `getIntervalStats` (the DB fetch + the parts not yet extracted).
- **`digestService`, `emailService`** — DB orchestration + Resend.
- **No route / middleware / schema tests** — the `requireAuth` JWT guard and the
  zod validation in `server/schemas.js` have zero coverage, so a validation
  regression ships silently.

### Why it matters

This untested set is now the majority of the business logic, and it's the part
that grows with each feature (admin console, email digests). The two places
where an untested bug does the most damage are `logService.addLog` (wrong
reschedule) and `adminService` (wrong user suspended/deleted).

### The fix (sketch)

1. **Add a lightweight Supabase mock for `db.js`** — a small fake exposing the
   chained builder (`.from().select().eq()...`) that returns canned
   `{ data, error }`. This unlocks unit tests for `logService`, `adminService`,
   `itemService`, and the DB half of `statsService`.
2. **Prefer the extract-pure-core pattern where it fits** — as done for
   `computeSpendByCategory`: pull the logic out of the DB call into a pure
   function and test that directly. Cheaper than mocking; do this first where a
   service has meaningful non-DB logic.
3. **Add a few route-level tests** (supertest against the Express app) for the
   auth guard and zod validation, to catch schema/middleware regressions.

### Suggested priority

`logService.addLog` and `adminService` first (highest blast radius), then route
validation, then the remaining `statsService` DB functions.

---

## 2. Auth emails are unbranded and land in spam

**Status:** Open · Logged 2026-07-22

### The gap

Supabase Auth's transactional emails (password reset, signup confirmation) use
the default GoTrue templates — plain text, no branding, generic wording. The
reset email tested on 2026-07-22 arrived from
`Digvy App <noreply@notifications.digvy.com>`, **landed in spam**, and looks
bare/spammy. These are the first emails a new user ever sees, so the current
state hurts both deliverability and first impression.

Note this is separate from the app's own digest email (`server/services/emailService.js`
+ `digestBuilder`), which is already HTML/branded. Auth email templates live in
**Supabase's dashboard**, not in this repo.

### Why it matters

- **Deliverability:** bare, link-heavy, text-only mail from a freshly-used
  sender domain is a classic spam signal. Users who don't check spam think
  signup/reset is broken (this is exactly how the original "didn't receive the
  email" report started).
- **Trust/brand:** the confirmation and reset emails are the product's first
  touchpoint; unbranded plain text reads as phishing.

### The fix (sketch)

1. **Customize the Supabase email templates** (Dashboard → Authentication →
   Email Templates) for Confirm signup, Reset password, and Magic link — add
   Digvy branding, a clear headline/CTA button, plain-english copy, and a
   footer. Keep them HTML but lightweight.
2. **Improve deliverability signals:** set a recognizable sender name, ensure
   SPF/DKIM/DMARC are all green for `notifications.digvy.com` in Resend, keep a
   plain-text alternative part, and avoid URL-shortener-style links. Consider a
   DMARC policy and warming the sender.
3. **Match the digest's visual style** so auth mail and digests feel like one
   product. The digest HTML (`digestBuilder`) is a reasonable template to mirror.
4. **Re-test** by triggering a reset + a fresh signup and confirming inbox
   placement (not spam) across Gmail/Apple Mail.

### Suggested priority

Medium. Delivery now works, so this is polish + deliverability hardening rather
than a hard blocker — but worth doing before any real user-acquisition push.
