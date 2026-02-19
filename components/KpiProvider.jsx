'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { useDemo, DEMO_DATA } from './DemoProvider';

const KpiContext = createContext({});

export const useKpis = () => useContext(KpiContext);

export const DEFAULT_KPIS = {
  avg_fee_per_sign_up: '',
  closed_no_fee_percent: '',
  application_fee: 3500,
  reconsideration_fee: 3000,
  hearing_fee: 6500,
  appeals_council_fee: 5000,
  federal_court_fee: 7000,
  application_win_rate: 0.36,
  reconsideration_win_rate: 0.14,
  hearing_win_rate: 0.54,
  appeals_council_win_rate: 0.13,
  federal_court_win_rate: 0.64,
  // Avg adjudication time in months (SSA FY2024, AARP Oct 2025, Atticus June 2024)
  application_adj_months: 8,
  reconsideration_adj_months: 7,
  hearing_adj_months: 11,
  appeals_council_adj_months: 9,
  federal_court_adj_months: 15,
  // Payment lag in days (no public source - user provides from firm experience)
  application_payment_lag_days: '',
  reconsideration_payment_lag_days: '',
  hearing_payment_lag_days: '',
  appeals_council_payment_lag_days: '',
  federal_court_payment_lag_days: '',
  // EAJA (Equal Access to Justice Act) fee — separate from case outcome win rates
  eaja_fee: 6500,
  eaja_adj_months: 6,
  eaja_payment_lag_days: '',
};

export function KpiProvider({ children }) {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const userId = user?.id;
  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    // In demo mode, use demo KPIs immediately
    if (isDemoMode) {
      setKpis(DEMO_DATA.kpis);
      setKpisLoading(false);
      return;
    }

    let mounted = true;

    const loadKpis = async () => {
      if (!userId) {
        setKpis(DEFAULT_KPIS);
        setKpisLoading(false);
        return;
      }

      try {
        // Try user_kpis table first
        const { data: kpiData, error: kpiError } = await supabase
          .from('user_kpis')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (kpiData && !kpiError) {
          const loaded = {};
          for (const key of Object.keys(DEFAULT_KPIS)) {
            loaded[key] = kpiData[key] ?? DEFAULT_KPIS[key];
          }
          setKpis(loaded);
          setKpisLoading(false);
          return;
        }

        // Fallback: migrate from user_fee_data for existing users
        const { data: feeData, error: feeError } = await supabase
          .from('user_fee_data')
          .select('application_fee, reconsideration_fee, hearing_fee, appeals_council_fee, federal_court_fee')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (feeData && !feeError) {
          setKpis({
            ...DEFAULT_KPIS,
            application_fee: feeData.application_fee ?? DEFAULT_KPIS.application_fee,
            reconsideration_fee: feeData.reconsideration_fee ?? DEFAULT_KPIS.reconsideration_fee,
            hearing_fee: feeData.hearing_fee ?? DEFAULT_KPIS.hearing_fee,
            appeals_council_fee: feeData.appeals_council_fee ?? DEFAULT_KPIS.appeals_council_fee,
            federal_court_fee: feeData.federal_court_fee ?? DEFAULT_KPIS.federal_court_fee,
          });
        } else {
          setKpis(DEFAULT_KPIS);
        }
      } catch (err) {
        if (mounted) setKpis(DEFAULT_KPIS);
      } finally {
        if (mounted) setKpisLoading(false);
      }
    };

    setKpisLoading(true);
    loadKpis();

    return () => { mounted = false; };
  }, [userId]);

  // Fire-and-forget: insert anonymized KPI snapshot if user opted in
  const maybeInsertSnapshot = async (kpiData) => {
    try {
      const { data: settings } = await supabase
        .from('firm_settings')
        .select('contribute_benchmarks')
        .eq('user_id', user.id)
        .single();

      if (!settings?.contribute_benchmarks) return;

      const snapshot = { snapshot_date: new Date().toISOString() };
      for (const key of Object.keys(DEFAULT_KPIS)) {
        const val = kpiData[key];
        snapshot[key] = (val === '' || val == null) ? null : val;
      }

      await supabase.from('kpi_snapshots').insert(snapshot);
    } catch (err) {
      console.warn('KPI snapshot insert failed (non-critical):', err?.message);
    }
  };

  const saveKpis = async (newKpis) => {
    if (isDemoMode) {
      setKpis(newKpis);
      return { error: null };
    }
    if (!user) return { error: 'Not authenticated' };

    const row = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const key of Object.keys(DEFAULT_KPIS)) {
      const val = newKpis[key];
      row[key] = (val === '' || val == null) ? null : val;
    }

    const { error } = await supabase
      .from('user_kpis')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      // Retry without EAJA columns in case they haven't been added to the DB yet
      const EAJA_FIELDS = ['eaja_fee', 'eaja_adj_months', 'eaja_payment_lag_days'];
      const rowWithoutEaja = { ...row };
      EAJA_FIELDS.forEach(f => delete rowWithoutEaja[f]);

      const { error: retryError } = await supabase
        .from('user_kpis')
        .upsert(rowWithoutEaja, { onConflict: 'user_id' });

      if (!retryError) {
        setKpis(newKpis);
        maybeInsertSnapshot(newKpis);
        return { error: null };
      }
      return { error: retryError };
    }

    setKpis(newKpis);
    maybeInsertSnapshot(newKpis);
    return { error: null };
  };

  return (
    <KpiContext.Provider value={{ kpis, kpisLoading, saveKpis, DEFAULT_KPIS }}>
      {children}
    </KpiContext.Provider>
  );
}
