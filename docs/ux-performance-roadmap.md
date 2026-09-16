# UX & Performance Roadmap

_Status: Living doc · Last updated: 2026-09-16 · Owner: Neal_

A prioritized set of recommendations for closing the gap between Digvy as it
works today and a product that feels world class. Grouped into five epics,
ordered by how much each one changes the felt quality of the app per unit of
work.

Every claim below was verified against the code or measured against the live
site on 2026-09-16 — measurements are in [Baseline](#baseline). Engineering
debt lives in [tech-debt.md](tech-debt.md); product gaps live in
[backlog.md](backlog.md). This doc is about *how the existing product feels*,
not about what it should do next.

---

## Baseline

Measured 2026-09-16.

**Production build** (`npm run build`):

| Asset | Raw | Gzip |
| --- | --- | --- |
| `index-*.js` | 552.70 kB | 154.18 kB |
| `index-*.css` | 38.09 kB | 7.61 kB |
| `index.html` | 14.43 kB | 4.21 kB |

One JS chunk. 1975 modules. Vite emits its >500 kB chunk warning on every
build. No code splitting anywhere in the app.

_These are the **before** numbers, kept as the baseline. C1 has since split the
bundle: the entry chunk is now 424.04 kB / 123.95 kB gzip._

**Live landing page** (`https://www.digvy.com/`, desktop, warm CDN cache):

- TTFB 140 ms · DOMContentLoaded 354 ms · First Contentful Paint 436 ms
- 2 subresources (the JS and CSS above)
- `x-vercel-cache: HIT` — the CDN layer is healthy and is *not* the problem

The static-HTML delivery is genuinely fast. Everything slow about Digvy
happens **after** that first paint: bundle parse, auth handshake, and a
request-per-screen data layer with no cache. That is where these epics aim.

**Not measured:** the signed-in cold path (dashboard first paint → data on
screen), because it needs a real session. Epic B is the theory of why it's
slow; item B0 is to instrument it and confirm before/after.

---

## Epic A — Perceived speed: end the blank-spinner loop

**Why this is first.** Digvy's data layer has no cache. Every hook
(`useDashboard`, `useItem`, `useItems`, the three in `useStats`) is the same
shape: `useState` + `useEffect` + fetch, starting at `loading: true` with
empty data. So *every* navigation — including tapping back to a dashboard you
looked at four seconds ago — throws away what was on screen and shows a
centered spinner until the network answers.

This is the difference users describe as "snappy" vs. "sluggish," and it is
mostly independent of how fast the server actually is. A 200 ms request that
replaces content with a spinner feels worse than a 600 ms request that quietly
revalidates content already on screen.

### A1. Cache responses and revalidate in the background · **High impact, medium effort**

Adopt a stale-while-revalidate cache keyed by request — either TanStack Query
(~13 kB gzip, does all of A1/A2/A5 at once) or a small hand-rolled
`Map`-backed cache in `client/src/api/client.js` if you want to keep the
dependency count down.

The rule to implement: if there is cached data for a key, render it
immediately and refetch in the background; only show a loading state when
there is genuinely nothing to show. Returning to the dashboard should be
instant, with a quiet refresh underneath.

Files: [client/src/hooks/useItems.js](client/src/hooks/useItems.js),
[client/src/hooks/useStats.js](client/src/hooks/useStats.js).

### A2. Replace the global `refreshKey` with targeted invalidation · **High impact, low effort**

[client/src/context/AppContext.jsx:11](client/src/context/AppContext.jsx:11)
exposes a single `triggerRefresh()` that bumps one integer, and every data
hook in the app lists `refreshKey` in its dependency array. So logging one
event refetches the dashboard, the open item, *and* all three stats endpoints
if those components are mounted — and each refetch drops back to a spinner
(A1).

Invalidate by key instead: logging an event should invalidate that item and
the dashboard, not the subscription summary.

### A3. Make the core actions optimistic · **High impact, medium effort**

Log Event, Snooze, and Delete all do the same thing today: disable the button,
await a full round trip, show a toast, then trigger a global refetch. During
that window the UI is frozen and says nothing useful.

The core loop of the product is "this happened, log it." That action should
feel instantaneous: apply the change locally, close the modal, and reconcile
when the server answers — rolling back with an error toast if it fails.

Files: [client/src/components/items/LogModal.jsx](client/src/components/items/LogModal.jsx),
[SnoozeModal.jsx](client/src/components/items/SnoozeModal.jsx),
[ItemDetailPage.jsx:27](client/src/components/items/ItemDetailPage.jsx:27).

### A4. Skeletons instead of centered spinners · **Medium impact, low effort**

[LoadingSpinner.jsx](client/src/components/common/LoadingSpinner.jsx) is used
as a whole-page state on the dashboard, item detail, edit, and stats. A
spinner communicates "something is happening somewhere"; a skeleton that
matches the card layout communicates "your list is loading, here's its shape"
and eliminates the layout jump when data lands.

Once A1 lands, skeletons should only ever appear on a true first load.

### A5. Cancel in-flight requests · **Medium impact, low effort**

There is no `AbortController` anywhere in the client (verified: zero matches
across `client/src`). Navigate dashboard → item → back quickly and a stale
response can resolve after the fresh one and overwrite it. `useItem` is the
most exposed, since `id` changes while a request is in flight.

The `cancelled` flag pattern already used in
[SettingsPage.jsx:36](client/src/components/settings/SettingsPage.jsx:36) is
the minimum fix; real abort signals are better.

---

## Epic B — Cut the latency floor on every request

**Why this matters.** Epic A hides latency. This epic removes it. The two
compound: a cached UI backed by a fast API feels instant, a cached UI backed
by a slow API feels stale.

### B0. Instrument the signed-in cold path first · **Prerequisite, low effort**

Before optimizing, measure: time from dashboard navigation to data on screen,
split into bundle parse / session resolution / API time, on a real account
over a throttled mobile connection. Everything below is a well-founded
prediction, but B1–B5 should be ranked by real numbers, not by this doc's
ordering.

### B1. Verify JWTs locally instead of calling Supabase Auth per request · ✅ **Done 2026-09-16**

**The problem this fixed.** `server/middleware/auth.js` called
`supabase.auth.getUser(token)` on **every single authenticated API request** —
a network round trip from the Vercel function to Supabase Auth *before* any
query could begin. Pure serial latency on every request in the app, paid three
times over for the three requests the Stats page fires.

**What shipped.** This project signs with ES256 and publishes its public key
at `/auth/v1/.well-known/jwks.json`, so `requireAuth` now verifies locally with
`jose` (`createRemoteJWKSet` caches the key set per warm instance and refetches
only on an unknown `kid`, so rotation still works). Covered by
`server/tests/auth.test.js` — signature, expiry, issuer, audience, and the
HS256 algorithm-confusion attack that pinning `algorithms` prevents.

Two details worth remembering:

- **A JWKS fetch failure returns 503, not 401.** The client signs the user out
  on any 401 ([client.js](client/src/api/client.js)), so mapping a network blip
  to 401 would log every active user out at once.
- **Admin routes use `requireAuthRemote`** — the original version of this doc
  said to do that so suspension takes effect immediately, which was wrong: a
  suspended user isn't calling admin routes. The real reason to keep the round
  trip there is blast radius — an operator token reads and deletes every user's
  data, and the console is low-traffic enough to afford the check.

**Open residual risk.** `setUserSuspended` uses Supabase's native ban, which
stops a suspended user obtaining a *new* token but cannot invalidate one
already issued. Under local verification they keep access until their access
token expires (Supabase default: 1 hour). Previously the remote check closed
this immediately. If that window is unacceptable, the fix is a short-TTL cached
revocation list consulted in `requireAuth` — not a return to a per-request auth
round trip.

### B2. Collapse the Stats page into one request · **High impact, low effort**

[StatsPage.jsx](client/src/components/stats/StatsPage.jsx) calls
`useSpendByCategory`, `useUpcomingCosts`, and `useSubscriptions`, and blocks
the whole page until all three resolve. Each hits a separate endpoint, and
each endpoint independently queries `items` joined to `logs` for the same user
([statsService.js](server/services/statsService.js) — three near-identical
`select(... logs(...))` calls). With B1 unfixed, that's three auth round trips
plus three overlapping table scans to render one screen.

Add `GET /api/stats/summary` that fetches items+logs once and runs all three
pure aggregations over it. `computeSpendByCategory` is already extracted and
pure; extract the other two the same way and the whole page becomes one
request and one query.

### B3. Stop over-fetching log history for list views · **Medium impact, low effort**

[itemService.js:19](server/services/itemService.js:19) selects `*, logs(*)` —
every column of every log, for every item — and the dashboard uses it to
compute exactly two things: `computeUrgency` (which needs no logs at all) and
`days_since_last` (which needs the most recent log's `date`).

So a user with two years of history downloads all of it to render a list that
shows "47d ago." This payload grows without bound as the product succeeds,
which is the worst shape for a performance problem to have.

Select only `logs(date)` for the dashboard path, or better, denormalize
`last_log_date` onto `items` and maintain it in `addLog`. Keep `logs(*)` for
`getById` ([itemService.js:73](server/services/itemService.js:73)), which
genuinely renders the full timeline.

### B4. Stop rebuilding the search index on every keystroke · **Medium impact, medium effort**

[server/routes/search.js:18](server/routes/search.js:18) fetches every item
and every log for the user, flattens log notes into a string, constructs a new
`Fuse` index, runs one query, and throws the index away — per request. The
client debounces at 200 ms
([DashboardPage.jsx:45](client/src/components/dashboard/DashboardPage.jsx:45)),
so a typed word is several of these.

Two options, in increasing order of effort:

1. **Search on the client.** The dashboard already holds the user's items. For
   a personal-scale dataset, a client-side Fuse index over cached data is
   instant, works offline, and deletes the endpoint's hot path entirely.
   Caveat: the dashboard set excludes evergreen and non-Active items, so the
   client index must be built from a full item list, not from `data`
   as currently shaped.
2. **Push it into Postgres.** A `tsvector` column with a GIN index makes this
   the database's problem and scales past what Fuse-in-memory can.

Option 1 is the better fit for where the product is, and pairs naturally with
Epic A's cache.

### B5. Batch CSV import and onboarding writes · **Medium impact, low effort**

[itemService.js:223](server/services/itemService.js:223) — `bulkCreate` is a
sequential `for` loop calling `create()`, and each `create()` does an insert,
possibly a second insert for logs, then a full `getById()` round trip to
return the enriched item. A 50-row CSV is on the order of 150 sequential
queries, each waiting for the last.

This is the slowest path in the product, and it sits on the two moments that
decide whether a new user stays: CSV import and the onboarding starter list
(`WelcomePage` → `api.importConfirm`). `handleFinish` in
[WelcomePage.jsx](client/src/components/onboarding/WelcomePage.jsx) then fires
N *more* parallel `updateItem` calls, each with its own B1 auth round trip.

Use a single bulk `insert()` for items and one for logs. Return the inserted
rows from the insert rather than re-reading each one.

### B6. Don't fetch categories on every form mount · **Low impact, low effort**

[ItemForm.jsx:26](client/src/components/items/ItemForm.jsx:26) calls
`api.getCategories()` on every mount — an extra request on both create and
edit — to populate a `<datalist>` that falls back to a perfectly good static
list. Cache it for the session (Epic A's cache handles this for free).

---

## Epic C — First load

### C1. Split the bundle by route · ✅ **Done 2026-09-16**

One 552 kB chunk, and everything is in it. Confirmed by grepping the built
output: the admin console ships to every user — `admin/users`, `AdminGate`,
and the digest-runs console are all in the bundle that a normal signed-in user
downloads, despite being reachable only by operators.

**What shipped.** Every route in [client/src/App.jsx](client/src/App.jsx) is
now `React.lazy` + `Suspense`, including the landing page and the app shell,
which are mutually exclusive by auth state. `Suspense` sits *inside* the router
so the bottom nav stays put while a route chunk loads.

Entry chunk: **552.70 kB → 424.04 kB** (154.18 → 123.95 kB gzip). Vite's
>500 kB warning is gone. Digvy's admin console is fully out of the entry chunk
(verified against the built output — the remaining `admin/users` strings there
belong to supabase-js's own `GoTrueAdminApi`, not this app).

**Next step if you want more.** The remaining 424 kB is React, react-dom,
react-router, and supabase-js. The auth client is the largest single piece, and
trimming it is a materially bigger job than this was — worth its own decision
rather than a follow-on.

### C2. Fix the static-HTML → React content swap · **Medium impact, medium effort**

[client/index.html](client/index.html) puts crawlable marketing copy inside
`#root` so no-JS crawlers see real content, and React wipes it on mount. The
tradeoff is documented in the file and was a deliberate, well-reasoned call
for SEO.

The cost is a visible flash for humans: the unstyled `system-ui` block paints
at ~436 ms, then gets replaced by the designed `LandingPage`. First paint
shows content that is not the product, and the two duplicate copy that can
drift.

Options: a build-time prerender of the real `LandingPage` markup (the "next
step" the file's own comment anticipates), or styling the static block to
match `LandingPage` closely enough that the swap isn't perceptible. The first
is more work and strictly better — it makes the flash *and* the duplication
go away.

### C3. Compress `og-image.png` · **Low impact, trivial effort**

`client/public/og-image.png` is 673 kB. It's never fetched by the app — only
by crawlers and social unfurlers — so it doesn't affect page load, but it's
~10× larger than it needs to be and slows the unfurl that sells the product.

### C4. Preconnect to Supabase · **Low impact, trivial effort**

The first authenticated action opens a fresh TLS connection to the Supabase
host. A `<link rel="preconnect">` in `index.html` overlaps that handshake with
bundle parse.

---

## Epic D — Interaction mechanics and polish

The details that separate "a working app" from "a well-made one." Individually
small; collectively they are most of what "world class" means.

### D1. Make the modal a real dialog · **Medium impact, low effort**

[client/src/components/common/Modal.jsx](client/src/components/common/Modal.jsx)
locks body scroll and renders a backdrop, but has no `role="dialog"`, no
`aria-modal`, no focus trap, no focus restore on close, and **no Escape key
handler**. Verified: there is no `Escape` or `keydown` handling anywhere in
`client/src` — pressing Esc does nothing in the entire app.

Escape-to-close is the single most-missed interaction here. `<dialog>` with
`showModal()` gets Esc, focus trapping, and the backdrop natively.

### D2. Replace `confirm()` for delete, and add undo · **Medium impact, low effort**

[ItemDetailPage.jsx:27](client/src/components/items/ItemDetailPage.jsx:27)
uses the native `confirm('Delete this item?')`. It's jarring against the app's
visual language, unstyleable, and on mobile it renders as an OS alert naming
the domain.

The better pattern for a destructive action on a single item: delete
immediately, navigate away, and offer **Undo** in the toast for a few seconds.
Fewer taps for the intended case, and genuinely more recoverable than a
confirm dialog — the user can undo a mistake they already made, not just one
they're about to make.

### D3. Fix the toast timer bug · **Low impact, trivial effort** · _confirmed bug_

[AppContext.jsx:15](client/src/context/AppContext.jsx:15) schedules
`setTimeout(() => setToast(null), 3000)` on every `showToast` call and never
clears the previous timer. Two toasts within 3 s and the first one's timer
fires during the second one's lifetime, cutting it short — so the message most
likely to matter (an error right after a success) is the one that flashes
past.

Keep the timer id in a ref and clear it before setting the next.

### D4. Add an error boundary · **Medium impact, low effort**

Verified: no `ErrorBoundary` or `componentDidCatch` anywhere in the client.
Any render-time exception — a malformed date, an unexpected null from the API
— unmounts the React tree and leaves a white screen with no way back short of
a manual reload. On a HashRouter SPA (E1), reloading doesn't reliably clear it
either.

One boundary around the routes, with a "something went wrong / reload" panel,
converts a dead end into a recoverable moment.

### D5. Stop swallowing errors · **Medium impact, low effort**

Eight `.catch(() => {})` sites drop errors on the floor. The worst are the
three in [useStats.js](client/src/hooks/useStats.js): if the stats API fails,
`loading` goes false with empty data, and the page renders *"No stats
available yet. Import items or log events with prices."* A failure is
presented to the user as a factual statement about their data — telling
someone who has logged a year of expenses that they have none.

[useItems.js:49](client/src/hooks/useItems.js:49) and
[ItemForm.jsx:31](client/src/components/items/ItemForm.jsx:31) are the same
shape. Distinguish empty from failed, and say which.

### D6. Let users log an event from the dashboard · **High impact, medium effort**

The core loop is: see an overdue item → record that it's handled. Today that's
four interactions — tap the card, wait for the detail fetch, tap Log Event,
fill the modal, submit — and it lands you on the detail page rather than back
at the list you were working through.

A "Done" affordance directly on `DashboardCard` for the common case (logged
today, no price, auto-advance the interval) would turn the app's central
action into one tap, with the full modal still available for the cases that
need a price or a note. Pairs with A3 to feel instant, and with D2's undo
pattern for recovery.

This is the most valuable item in Epic D and arguably belongs in
[backlog.md](backlog.md) as product work.

### D7. Fix the surprising filter chips · **Low impact, low effort**

[DashboardPage.jsx:86](client/src/components/dashboard/DashboardPage.jsx:86)
and [:91](client/src/components/dashboard/DashboardPage.jsx:91) — selecting a
category silently clears the urgency filter and vice versa. The chips look
like independent toggles and behave as one mutually exclusive group, so
"Overdue" + "Car" is unreachable and the user watches their first selection
vanish without explanation.

Either let them combine (`category AND urgency`, which the `useMemo` filters
already support with a two-line change) or render them as one visibly
segmented control so the exclusivity is legible.

Adjacent, while in this file: line 123 has a dead
`(categories.length > 0 || true)` condition that always evaluates true.

### D8. Move the LogModal submit above the fold · **Low impact, low effort**

[LogModal.jsx](client/src/components/items/LogModal.jsx) renders date, times,
price, note, and a whole "set up the next one" section with its own nested
date and time fields — inside a `max-h-[85vh]` scroll container. On a phone
the submit button is well below the fold, so the primary action of the app's
primary modal requires scrolling to find.

Pin the submit to the sheet's footer outside the scroll area, and collapse
"set up the next one" to a summary line that expands on tap.

---

## Epic E — Navigation and platform

### E1. Move from `HashRouter` to `BrowserRouter` · **Medium impact, low effort**

[App.jsx:27](client/src/App.jsx:27) uses `HashRouter`, so every URL carries a
`/#/` — `digvy.com/#/items/abc123`. This costs more than aesthetics:

- The fragment is never sent to the server, so per-route prerendering,
  server-side redirects, and route-level SEO (C2) are all off the table.
- Analytics tools need special configuration to see route changes at all.
- Shared links look homemade in a product whose whole job is being trusted
  with someone's life admin.

Vercel already rewrites unmatched paths to `index.html` for the SPA, so the
hosting side of this is in place. Note that the Supabase auth flows put their
tokens in the URL fragment too — password recovery and email confirmation
should be re-tested end to end as part of this change.

### E2. Make cards and nav items real links · **Medium impact, low effort**

`DashboardCard`, `SearchResultCard`, and `BottomNav` are all `<button>`
elements calling `navigate()`. They are therefore not links: no cmd/ctrl-click
to open in a new tab, no middle-click, no right-click "copy link," no hover
URL preview, and nothing for a screen reader to identify as navigation.

`<Link>` from React Router renders a real anchor and keeps the same click
behavior. Best done together with E1, when the URLs become worth copying.

### E3. Decide about the PWA · **Medium impact, medium effort**

[client/public/manifest.json](client/public/manifest.json) declares
`"display": "standalone"` with a full icon set, and `index.html` sets
`apple-mobile-web-app-capable`. So Digvy invites users to install it to the
home screen — but there is no service worker, so the installed app is a blank
screen with no browser chrome to recover with whenever the network is
unavailable.

That's a worse experience than the browser tab it replaces. Either add a
service worker (precache the shell, serve last-known items offline — a strong
fit for a product about things you check occasionally and may open in a
basement or a parking garage), or drop `standalone` until it's ready. The
current middle state is the one option that actively misleads.

### E4. Dark mode · **Low impact, medium effort**

`index.html` sets a dark `theme-color`, but the app is hardcoded light
throughout — `bg-white`, `text-slate-900`, `bg-slate-50` on `<body>`. On a
phone in dark mode at night, Digvy is a white rectangle.

Tailwind v4's `dark:` variants over the existing `@theme` block in
[index.css](client/src/index.css) make this mechanical, if tedious across ~30
components. Worth doing once the palette settles; not worth doing before Epic
D changes the components.

---

## Suggested sequence

If the goal is maximum felt improvement per week of work:

1. ~~**B1** (local JWT verification)~~ — ✅ done 2026-09-16.
2. ~~**C1** (route code splitting)~~ — ✅ done 2026-09-16.
3. **A1 + A2** (cache + targeted invalidation) — the largest single change to
   how the app feels, and it makes A3/A5/B6 nearly free.
4. **D3, D4, D5** (toast timer, error boundary, swallowed errors) — small,
   independent correctness fixes; D5 is currently telling users false things
   about their own data.
5. **B2 + B3** (one stats request, stop over-fetching logs) — B3 also defuses
   a problem that gets worse with tenure.
6. **D1, D2, D8** (dialog semantics, undo, modal layout) — the polish pass on
   the screens users touch most.
7. **D6** (log from the dashboard) — the highest-value product change here;
   worth promoting to [backlog.md](backlog.md).
8. **E1 + E2** (real URLs, real links) — do them together.
9. **B4, B5** (search, bulk writes) — schedule by what B0 measures.
10. **C2, E3, E4** (prerender, PWA, dark mode) — larger bets, each worth its
    own decision.

Items **B0** (instrument first) and **C3/C4** (trivial) can slot in anywhere.
