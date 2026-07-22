-- Digvy Migration 006: explicit billing period for subscriptions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds billing_period_months so a Subscription can carry its own periodicity
-- (Monthly / Quarterly / Yearly / custom) independent of the logic_type/Interval
-- schedule. The subscription cost estimate in statsService reads this column.

ALTER TABLE items ADD COLUMN billing_period_months INTEGER;

-- Backfill: subscriptions that already captured a cadence via Interval logic
-- inherit it, so the annual-cost estimate keeps working after this deploy.
UPDATE items
  SET billing_period_months = interval_months
  WHERE category = 'Subscription'
    AND logic_type = 'Interval'
    AND interval_months IS NOT NULL;
