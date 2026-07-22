# Tech Debt

_Status: Living doc · Last updated: 2026-07-21 · Owner: Neal_

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
