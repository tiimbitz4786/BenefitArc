'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

const METRIC_CARDS = [
  {
    key: 'pipeline_value',
    label: 'Total Pipeline Value',
    toolName: 'case-pipeline',
    toolLabel: 'Case Pipeline',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
    extract: (data) => {
      if (!data?.fees || !data?.pipeline) return null;
      let total = 0;
      const stages = ['application', 'reconsideration', 'hearing', 'appeals_council', 'federal_court'];
      stages.forEach(s => {
        const cases = parseFloat(data.pipeline[s]) || 0;
        const fee = parseFloat(data.fees[s]) || 0;
        const winRate = data.winRates ? (parseFloat(data.winRates[s]) || 0) : 0;
        total += cases * fee * winRate;
      });
      return total;
    },
    format: (v) => '$' + Math.round(v).toLocaleString(),
  },
  {
    key: 'annual_revenue',
    label: 'Projected Annual Revenue',
    toolName: 'steady-state',
    toolLabel: 'Steady State',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    extract: (data) => {
      if (!data?.firmData?.revenueByLevel) return null;
      const years = Object.keys(data.firmData.revenueByLevel);
      if (years.length === 0) return null;
      const lastYear = years[years.length - 1];
      const rev = data.firmData.revenueByLevel[lastYear];
      if (!rev) return null;
      let total = 0;
      Object.values(rev).forEach(v => { total += parseFloat(v) || 0; });
      return total > 0 ? total : null;
    },
    format: (v) => '$' + Math.round(v).toLocaleString(),
  },
  {
    key: 'monthly_intake',
    label: 'Monthly Intake Rate',
    toolName: 'steady-state',
    toolLabel: 'Steady State',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
    extract: (data) => {
      const intake = data?.firmData?.recentMonthlyIntake;
      if (!intake) return null;
      const vals = [intake.month1, intake.month2, intake.month3]
        .map(v => parseFloat(v))
        .filter(v => v > 0);
      if (vals.length === 0) return null;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    },
    format: (v) => v.toLocaleString() + ' cases/mo',
  },
  {
    key: 'open_cases',
    label: 'Open Cases',
    toolName: 'case-pipeline',
    toolLabel: 'Case Pipeline',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    extract: (data) => {
      if (!data?.pipeline) return null;
      let total = 0;
      Object.values(data.pipeline).forEach(v => { total += parseInt(v) || 0; });
      return total > 0 ? total : null;
    },
    format: (v) => v.toLocaleString(),
  },
];

export default function DashboardMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({});
  const isDemoMode = user?.id === 'demo-user-id';

  useEffect(() => {
    if (!user || isDemoMode) return;

    const loadMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('saved_scenarios')
          .select('tool_name, data')
          .eq('user_id', user.id)
          .eq('is_auto_save', true);

        if (error || !data) return;

        const m = {};
        METRIC_CARDS.forEach(card => {
          const scenario = data.find(s => s.tool_name === card.toolName);
          if (scenario?.data) {
            const val = card.extract(scenario.data);
            if (val != null) m[card.key] = val;
          }
        });
        setMetrics(m);
      } catch {}
    };

    loadMetrics();
  }, [user, isDemoMode]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '32px',
    }}>
      {METRIC_CARDS.map(card => {
        const value = metrics[card.key];
        return (
          <div key={card.key} style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: card.gradient,
            }} />
            <div style={{
              fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase',
              letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '500',
            }}>
              {card.label}
            </div>
            <div style={{
              fontSize: value != null ? '28px' : '14px',
              fontWeight: '700',
              color: value != null ? '#f8fafc' : '#475569',
              marginBottom: '6px',
            }}>
              {value != null ? card.format(value) : `Run ${card.toolLabel} to see this`}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              from {card.toolLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
