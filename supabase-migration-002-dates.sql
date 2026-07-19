-- Digvy Migration 002: real DATE columns + is_evergreen flag
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Replaces the TEXT date columns and the 'never' sentinel value.

BEGIN;

-- 1. Evergreen flag replaces next_date = 'never'
ALTER TABLE items ADD COLUMN is_evergreen BOOLEAN NOT NULL DEFAULT false;
UPDATE items SET is_evergreen = true WHERE next_date = 'never';

-- 2. Null out anything that isn't a valid ISO date, then convert to DATE
UPDATE items SET next_date = NULL
  WHERE next_date IS NOT NULL AND next_date !~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE items ALTER COLUMN next_date TYPE DATE USING next_date::date;

UPDATE items SET cancel_by_date = NULL
  WHERE cancel_by_date IS NOT NULL AND cancel_by_date !~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE items ALTER COLUMN cancel_by_date TYPE DATE USING cancel_by_date::date;

UPDATE items SET snoozed_until = NULL
  WHERE snoozed_until IS NOT NULL AND snoozed_until !~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE items ALTER COLUMN snoozed_until TYPE DATE USING snoozed_until::date;

-- 3. logs.date is NOT NULL — backfill invalid values from created_at
UPDATE logs SET date = to_char(created_at, 'YYYY-MM-DD')
  WHERE date !~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE logs ALTER COLUMN date TYPE DATE USING date::date;

-- 4. Index for upcoming-date queries (notification digests, dashboards)
CREATE INDEX idx_items_user_next_date ON items(user_id, next_date)
  WHERE status = 'Active';

COMMIT;
