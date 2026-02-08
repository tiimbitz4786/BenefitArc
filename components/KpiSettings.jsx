'use client';

import React, { useState, useEffect } from 'react';
import { useKpis, DEFAULT_KPIS } from './KpiProvider';
import Link from 'next/link';

const STAGES = [
  { key: 'application', label: 'Application' },
  { key: 'reconsideration', label: 'Reconsideration' },
  { key: 'hearing', label: 'ALJ Hearing' },
  { key: 'appeals_council', label: 'Appeals Council' },
  { key: 'federal_court', label: 'Federal Court' },
];

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(99, 102, 241, 0.3)',
  background: 'rgba(15, 15, 25, 0.8)',
  color: '#f8fafc',
  fontSize: '14px',
  outline: 'none',
};

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kpiArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id="kpiGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#kpiArcGradient)" strokeWidth="2" opacity="0.5"/>
      <path
        d="M 25 65 Q 50 20 75 65"
        stroke="url(#kpiArcGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#kpiGlow)"
      />
      <circle cx="25" cy="65" r="4" fill="#10b981" filter="url(#kpiGlow)"/>
      <circle cx="50" cy="30" r="5" fill="#6366f1" filter="url(#kpiGlow)"/>
      <circle cx="75" cy="65" r="4" fill="#3b82f6" filter="url(#kpiGlow)"/>
      {/* Gear accent */}
      <circle cx="50" cy="50" r="10" stroke="url(#kpiArcGradient)" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="50" cy="50" r="4" fill="url(#kpiArcGradient)" opacity="0.5"/>
    </svg>
  );
}

export default function KpiSettings() {
  const { kpis, kpisLoading, saveKpis } = useKpis();
  const [form, setForm] = useState(DEFAULT_KPIS);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form from context once loaded
  useEffect(() => {
    if (!kpisLoading && !initialized) {
      setForm({ ...kpis });
      setInitialized(true);
    }
  }, [kpisLoading, kpis, initialized]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    // Convert form values to proper types for storage
    const cleanKpis = {};
    for (const key of Object.keys(DEFAULT_KPIS)) {
      const raw = form[key];
      if (raw === '' || raw == null) {
        cleanKpis[key] = DEFAULT_KPIS[key] === '' ? '' : (parseFloat(raw) || DEFAULT_KPIS[key]);
      } else {
        cleanKpis[key] = parseFloat(raw) || DEFAULT_KPIS[key];
      }
    }
    // Preserve empty-string fields that are legitimately optional
    for (const key of ['avg_fee_per_sign_up', 'closed_no_fee_percent',
      'application_payment_lag_days', 'reconsideration_payment_lag_days',
      'hearing_payment_lag_days', 'appeals_council_payment_lag_days',
      'federal_court_payment_lag_days']) {
      if (form[key] === '' || form[key] == null) cleanKpis[key] = '';
    }

    const { error } = await saveKpis(cleanKpis);
    setSaving(false);

    if (error) {
      setSaveMessage('Error saving KPIs. Please try again.');
    } else {
      setSaveMessage('KPIs saved successfully.');
    }
  };

  const resetSection = (section) => {
    setSaveMessage('');
    if (section === 'firm') {
      setForm(prev => ({
        ...prev,
        avg_fee_per_sign_up: DEFAULT_KPIS.avg_fee_per_sign_up,
        closed_no_fee_percent: DEFAULT_KPIS.closed_no_fee_percent,
      }));
    } else if (section === 'fees') {
      setForm(prev => ({
        ...prev,
        application_fee: DEFAULT_KPIS.application_fee,
        reconsideration_fee: DEFAULT_KPIS.reconsideration_fee,
        hearing_fee: DEFAULT_KPIS.hearing_fee,
        appeals_council_fee: DEFAULT_KPIS.appeals_council_fee,
        federal_court_fee: DEFAULT_KPIS.federal_court_fee,
      }));
    } else if (section === 'winrates') {
      setForm(prev => ({
        ...prev,
        application_win_rate: DEFAULT_KPIS.application_win_rate,
        reconsideration_win_rate: DEFAULT_KPIS.reconsideration_win_rate,
        hearing_win_rate: DEFAULT_KPIS.hearing_win_rate,
        appeals_council_win_rate: DEFAULT_KPIS.appeals_council_win_rate,
        federal_court_win_rate: DEFAULT_KPIS.federal_court_win_rate,
      }));
    } else if (section === 'adjtime') {
      setForm(prev => ({
        ...prev,
        application_adj_months: DEFAULT_KPIS.application_adj_months,
        reconsideration_adj_months: DEFAULT_KPIS.reconsideration_adj_months,
        hearing_adj_months: DEFAULT_KPIS.hearing_adj_months,
        appeals_council_adj_months: DEFAULT_KPIS.appeals_council_adj_months,
        federal_court_adj_months: DEFAULT_KPIS.federal_court_adj_months,
      }));
    } else if (section === 'paylag') {
      setForm(prev => ({
        ...prev,
        application_payment_lag_days: DEFAULT_KPIS.application_payment_lag_days,
        reconsideration_payment_lag_days: DEFAULT_KPIS.reconsideration_payment_lag_days,
        hearing_payment_lag_days: DEFAULT_KPIS.hearing_payment_lag_days,
        appeals_council_payment_lag_days: DEFAULT_KPIS.appeals_council_payment_lag_days,
        federal_court_payment_lag_days: DEFAULT_KPIS.federal_court_payment_lag_days,
      }));
    }
  };

  if (kpisLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#6366f1', fontSize: '14px',
      }}>
        Loading KPI Settings...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ filter: 'drop-shadow(0 0 30px rgba(16, 185, 129, 0.4))', marginBottom: '16px' }}>
            <BenefitArcLogo size={70} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            KPI Settings
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Set your firm's key performance indicators. These values serve as defaults across all BenefitArc tools.
          </p>
        </div>

        {/* Info callout */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '32px',
          fontSize: '12px',
          color: '#6ee7b7',
          lineHeight: '1.6',
        }}>
          <strong>Tip:</strong> Avg Fee Per Sign-Up = Avg Fee Per Win × (1 − Closed No Fee %).
          Values you set here will auto-populate as defaults in Case Pipeline Analyzer and Steady State Projection,
          but remain editable within each tool.
        </div>

        {/* Section 1: Firm-Level KPIs */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Firm-Level KPIs
            </h2>
            <button
              onClick={() => resetSection('firm')}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Avg Fee Per Sign-Up ($)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>$</span>
                <input
                  type="number"
                  value={form.avg_fee_per_sign_up}
                  onChange={(e) => handleChange('avg_fee_per_sign_up', e.target.value)}
                  placeholder="e.g. 3000"
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Closed No Fee (%)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.1"
                  value={form.closed_no_fee_percent}
                  onChange={(e) => handleChange('closed_no_fee_percent', e.target.value)}
                  placeholder="e.g. 30"
                  style={{ ...inputStyle, paddingRight: '28px' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Average Fee Per Win by Stage */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Average Fee Per Win by Stage
            </h2>
            <button
              onClick={() => resetSection('fees')}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {STAGES.map(stage => (
              <div key={stage.key}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  {stage.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>$</span>
                  <input
                    type="number"
                    value={form[`${stage.key}_fee`]}
                    onChange={(e) => handleChange(`${stage.key}_fee`, e.target.value)}
                    placeholder={DEFAULT_KPIS[`${stage.key}_fee`].toString()}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Win Rates by Stage */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Win Rates by Stage
            </h2>
            <button
              onClick={() => resetSection('winrates')}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
            Enter as whole numbers (e.g., 36 for 36%). Stored as decimals internally.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {STAGES.map(stage => {
              const rateKey = `${stage.key}_win_rate`;
              const displayVal = form[rateKey] !== '' && form[rateKey] != null
                ? Math.round(parseFloat(form[rateKey]) * 100)
                : '';
              return (
                <div key={stage.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                    {stage.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={displayVal}
                      onChange={(e) => {
                        const pct = e.target.value;
                        handleChange(rateKey, pct === '' ? '' : parseFloat(pct) / 100);
                      }}
                      placeholder={Math.round(DEFAULT_KPIS[rateKey] * 100).toString()}
                      style={{ ...inputStyle, paddingRight: '28px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Average Adjudication Time by Stage */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Avg Adjudication Time by Stage
            </h2>
            <button
              onClick={() => resetSection('adjtime')}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
            Time from entering a stage to receiving a decision, in months.
            Defaults from SSA FY2024, AARP (Oct 2025), Atticus (June 2024).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {STAGES.map(stage => {
              const adjKey = `${stage.key}_adj_months`;
              return (
                <div key={stage.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                    {stage.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={form[adjKey] ?? ''}
                      onChange={(e) => handleChange(adjKey, e.target.value)}
                      placeholder={DEFAULT_KPIS[adjKey].toString()}
                      style={{ ...inputStyle, paddingRight: '56px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '12px' }}>months</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Payment Lag by Stage */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Payment Lag by Stage
            </h2>
            <button
              onClick={() => resetSection('paylag')}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
            Days from favorable decision to attorney fee payment. Enter based on your firm's
            experience — there is no authoritative public data for this metric.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {STAGES.map(stage => {
              const lagKey = `${stage.key}_payment_lag_days`;
              return (
                <div key={stage.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                    {stage.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form[lagKey] ?? ''}
                      onChange={(e) => handleChange(lagKey, e.target.value)}
                      placeholder="e.g. 75"
                      style={{ ...inputStyle, paddingRight: '44px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '12px' }}>days</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '14px 48px',
              borderRadius: '12px',
              border: 'none',
              background: saving
                ? 'rgba(16, 185, 129, 0.3)'
                : 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 8px 24px rgba(16, 185, 129, 0.3)',
            }}
          >
            {saving ? 'Saving...' : 'Save KPI Settings'}
          </button>
        </div>

        {/* Save message */}
        {saveMessage && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: saveMessage.includes('Error')
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${saveMessage.includes('Error') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: saveMessage.includes('Error') ? '#fca5a5' : '#6ee7b7',
            fontSize: '13px',
            textAlign: 'center',
          }}>
            {saveMessage}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              color: '#6366f1',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            ← Back to Tools
          </Link>
        </div>
      </div>
    </div>
  );
}
