-- Digvy Migration 004: admin / customer-service console (Phase 1)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Adds operator roles and an append-only audit log. Both tables are
-- service-role only: RLS is enabled with NO policies, so the anon/authenticated
-- roles are denied by default and only the server's service-role client (which
-- bypasses RLS) can read or write them.

-- Operator roles. Absence of a row = ordinary user (no console access).
CREATE TABLE admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('support', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- (no policies: default-deny for anon/authenticated; service role bypasses RLS)

-- Append-only record of every operator write action.
CREATE TABLE admin_audit (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id       UUID NOT NULL REFERENCES auth.users(id),
  action         TEXT NOT NULL,          -- e.g. 'digest.resend'
  target_user_id UUID,                   -- subject of the action, if any
  payload        JSONB,                  -- action-specific detail
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_target_idx ON admin_audit (target_user_id, created_at DESC);
CREATE INDEX admin_audit_actor_idx  ON admin_audit (actor_id, created_at DESC);

ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;
-- (no policies: default-deny for anon/authenticated; service role bypasses RLS)

-- Bootstrap the first admin. The console can't grant the first role
-- (chicken-and-egg), so seed it here by email. Idempotent.
INSERT INTO admin_users (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'digvy@karasic.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
