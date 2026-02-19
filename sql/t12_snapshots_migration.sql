-- ============================================================
-- T12 Snapshots Migration
-- Run this in your Supabase Dashboard SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS t12_snapshots (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date   timestamptz NOT NULL DEFAULT now(),
  marketing_pct   numeric,
  labor_pct       numeric,
  other_pct       numeric,
  profit_pct      numeric,
  ss_revenue_pct  numeric
);

CREATE INDEX IF NOT EXISTS idx_t12_snapshots_date ON t12_snapshots (snapshot_date DESC);

ALTER TABLE t12_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert t12 snapshots"
  ON t12_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can read t12 snapshots"
  ON t12_snapshots
  FOR SELECT
  TO service_role
  USING (true);
