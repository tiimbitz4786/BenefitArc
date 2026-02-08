'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

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
};

export function KpiProvider({ children }) {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    const loadKpis = async () => {
      if (!user) {
        setKpis(DEFAULT_KPIS);
        setKpisLoading(false);
        return;
      }

      try {
        // Try user_kpis table first
        const { data: kpiData, error: kpiError } = await supabase
          .from('user_kpis')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (kpiData && !kpiError) {
          setKpis({
            avg_fee_per_sign_up: kpiData.avg_fee_per_sign_up ?? DEFAULT_KPIS.avg_fee_per_sign_up,
            closed_no_fee_percent: kpiData.closed_no_fee_percent ?? DEFAULT_KPIS.closed_no_fee_percent,
            application_fee: kpiData.application_fee ?? DEFAULT_KPIS.application_fee,
            reconsideration_fee: kpiData.reconsideration_fee ?? DEFAULT_KPIS.reconsideration_fee,
            hearing_fee: kpiData.hearing_fee ?? DEFAULT_KPIS.hearing_fee,
            appeals_council_fee: kpiData.appeals_council_fee ?? DEFAULT_KPIS.appeals_council_fee,
            federal_court_fee: kpiData.federal_court_fee ?? DEFAULT_KPIS.federal_court_fee,
            application_win_rate: kpiData.application_win_rate ?? DEFAULT_KPIS.application_win_rate,
            reconsideration_win_rate: kpiData.reconsideration_win_rate ?? DEFAULT_KPIS.reconsideration_win_rate,
            hearing_win_rate: kpiData.hearing_win_rate ?? DEFAULT_KPIS.hearing_win_rate,
            appeals_council_win_rate: kpiData.appeals_council_win_rate ?? DEFAULT_KPIS.appeals_council_win_rate,
            federal_court_win_rate: kpiData.federal_court_win_rate ?? DEFAULT_KPIS.federal_court_win_rate,
          });
          setKpisLoading(false);
          return;
        }

        // Fallback: migrate from user_fee_data for existing users
        const { data: feeData, error: feeError } = await supabase
          .from('user_fee_data')
          .select('application_fee, reconsideration_fee, hearing_fee, appeals_council_fee, federal_court_fee')
          .eq('user_id', user.id)
          .single();

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
        setKpis(DEFAULT_KPIS);
      } finally {
        setKpisLoading(false);
      }
    };

    setKpisLoading(true);
    loadKpis();
  }, [user]);

  const saveKpis = async (newKpis) => {
    if (!user) return { error: 'Not authenticated' };

    const row = {
      user_id: user.id,
      avg_fee_per_sign_up: newKpis.avg_fee_per_sign_up || null,
      closed_no_fee_percent: newKpis.closed_no_fee_percent || null,
      application_fee: newKpis.application_fee ?? null,
      reconsideration_fee: newKpis.reconsideration_fee ?? null,
      hearing_fee: newKpis.hearing_fee ?? null,
      appeals_council_fee: newKpis.appeals_council_fee ?? null,
      federal_court_fee: newKpis.federal_court_fee ?? null,
      application_win_rate: newKpis.application_win_rate ?? null,
      reconsideration_win_rate: newKpis.reconsideration_win_rate ?? null,
      hearing_win_rate: newKpis.hearing_win_rate ?? null,
      appeals_council_win_rate: newKpis.appeals_council_win_rate ?? null,
      federal_court_win_rate: newKpis.federal_court_win_rate ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_kpis')
      .upsert(row, { onConflict: 'user_id' });

    if (!error) {
      setKpis(newKpis);
    }

    return { error };
  };

  return (
    <KpiContext.Provider value={{ kpis, kpisLoading, saveKpis, DEFAULT_KPIS }}>
      {children}
    </KpiContext.Provider>
  );
}
