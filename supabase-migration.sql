-- Digvy: Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Items table
CREATE TABLE items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Historical')),
  logic_type TEXT NOT NULL DEFAULT 'Fixed' CHECK (logic_type IN ('Fixed', 'Interval', 'Reference')),
  interval_months INTEGER,
  next_date TEXT,  -- ISO date string or 'never' or null
  cancel_by_date TEXT,  -- ISO date string or null
  details TEXT NOT NULL DEFAULT '',
  link_url TEXT,
  date_type TEXT NOT NULL DEFAULT 'firm' CHECK (date_type IN ('firm', 'flexible')),
  booking_lead_days INTEGER NOT NULL DEFAULT 21,
  snoozed_until TEXT,  -- ISO date string or null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Logs table (normalized from embedded array)
CREATE TABLE logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- ISO date string
  time TEXT,
  price_paid NUMERIC,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_status ON items(user_id, status);
CREATE INDEX idx_logs_item_id ON logs(item_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);

-- 4. Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — users can only access their own data
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs"
  ON logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON logs FOR DELETE
  USING (auth.uid() = user_id);
