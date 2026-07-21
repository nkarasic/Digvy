-- Digvy Migration 005: persisted digest runs (admin console Phase 3)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Records each digest run (the nightly cron and per-user admin resends) so
-- support can answer "why didn't my email send?". Service-role only: RLS on
-- with no policies.

CREATE TABLE digest_runs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dry_run      BOOLEAN NOT NULL DEFAULT false,
  scope        TEXT NOT NULL DEFAULT 'all',   -- 'all' (cron) or a user_id (admin resend)
  triggered_by UUID,                          -- operator who triggered it, if any
  sent         INT NOT NULL DEFAULT 0,
  skipped      INT NOT NULL DEFAULT 0,
  errors       INT NOT NULL DEFAULT 0,
  detail       JSONB                          -- per-user sent/skipped/errors breakdown
);

CREATE INDEX digest_runs_ran_at_idx ON digest_runs (ran_at DESC);

ALTER TABLE digest_runs ENABLE ROW LEVEL SECURITY;
-- (no policies: default-deny for anon/authenticated; service role bypasses RLS)
