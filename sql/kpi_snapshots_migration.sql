-- ============================================================
-- KPI Snapshots & Opt-In Consent Migration
-- Run this in your Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Add opt-in column to firm_settings
ALTER TABLE firm_settings
ADD COLUMN IF NOT EXISTS contribute_benchmarks boolean NOT NULL DEFAULT false;

-- 2. Create anonymized kpi_snapshots table (no user_id)
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id                                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date                     timestamptz NOT NULL DEFAULT now(),

  -- Firm-level metrics
  avg_fee_per_sign_up               numeric,
  closed_no_fee_percent             numeric,

  -- Fees by stage
  application_fee                   numeric,
  reconsideration_fee               numeric,
  hearing_fee                       numeric,
  appeals_council_fee               numeric,
  federal_court_fee                 numeric,

  -- Win rates
  application_win_rate              numeric,
  reconsideration_win_rate          numeric,
  hearing_win_rate                  numeric,
  appeals_council_win_rate          numeric,
  federal_court_win_rate            numeric,

  -- Adjudication time (months)
  application_adj_months            numeric,
  reconsideration_adj_months        numeric,
  hearing_adj_months                numeric,
  appeals_council_adj_months        numeric,
  federal_court_adj_months          numeric,

  -- Payment lag (days)
  application_payment_lag_days      numeric,
  reconsideration_payment_lag_days  numeric,
  hearing_payment_lag_days          numeric,
  appeals_council_payment_lag_days  numeric,
  federal_court_payment_lag_days    numeric,

  -- EAJA
  eaja_fee                          numeric,
  eaja_adj_months                   numeric,
  eaja_payment_lag_days             numeric
);

-- 3. Index for trend queries by date
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date ON kpi_snapshots (snapshot_date DESC);

-- 4. Row Level Security
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert (needed for client-side writes)
CREATE POLICY "Authenticated users can insert snapshots"
  ON kpi_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only service_role can read (for admin trend analysis)
CREATE POLICY "Service role can read snapshots"
  ON kpi_snapshots
  FOR SELECT
  TO service_role
  USING (true);
