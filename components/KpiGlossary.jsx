'use client';

import React, { useState, useRef, useMemo } from 'react';
import ExportToolbar from './ExportToolbar';

const GLOSSARY_ENTRIES = [
  // Firm-Level
  { id: 'avg_fee_per_sign_up', name: 'Avg Fee Per Sign-Up', category: 'Firm-Level', description: 'The average attorney fee earned per new client sign-up, accounting for cases that close without a fee. Calculated as Avg Fee Per Win × (1 − Closed No Fee %).', defaultValue: '—', unit: '$', dataSource: 'Firm-provided' },
  { id: 'closed_no_fee_percent', name: 'Closed No Fee %', category: 'Firm-Level', description: 'The percentage of signed cases that close without generating any attorney fee — includes denials at all levels, client withdrawals, and administrative closures.', defaultValue: '—', unit: '%', dataSource: 'Firm-provided' },

  // Fees (6 stages including EAJA)
  { id: 'application_fee', name: 'Application Fee', category: 'Fee Per Win', description: 'Average attorney fee awarded when a case is won at the initial application (Title II/SSI) stage. Typically the lowest fee since back-pay accrual is minimal.', defaultValue: '$3,500', unit: '$', dataSource: 'Firm-provided (SSA default: $3,500)' },
  { id: 'reconsideration_fee', name: 'Reconsideration Fee', category: 'Fee Per Win', description: 'Average attorney fee awarded when a case is won at the reconsideration stage. Generally lower than hearing fees due to shorter back-pay periods.', defaultValue: '$3,000', unit: '$', dataSource: 'Firm-provided (SSA default: $3,000)' },
  { id: 'hearing_fee', name: 'ALJ Hearing Fee', category: 'Fee Per Win', description: 'Average attorney fee awarded when a case is won at the Administrative Law Judge hearing level. Often the largest fee due to substantial back-pay accumulation.', defaultValue: '$6,500', unit: '$', dataSource: 'Firm-provided (SSA default: $6,500)' },
  { id: 'appeals_council_fee', name: 'Appeals Council Fee', category: 'Fee Per Win', description: 'Average attorney fee awarded when a case is won after Appeals Council review. Reflects extended back-pay periods from multiple levels of adjudication.', defaultValue: '$5,000', unit: '$', dataSource: 'Firm-provided (SSA default: $5,000)' },
  { id: 'federal_court_fee', name: 'Federal Court Fee', category: 'Fee Per Win', description: 'Average attorney fee awarded when a case is won at the federal district court level. Typically includes remand back to SSA and additional back-pay accrual.', defaultValue: '$7,000', unit: '$', dataSource: 'Firm-provided (SSA default: $7,000)' },
  { id: 'eaja_fee', name: 'EAJA Fee', category: 'Fee Per Win', description: 'Equal Access to Justice Act fee — a separate fee the government pays on top of the Title II attorney fee when a federal court case is won and the government\'s position was not substantially justified. Not a win rate category; it is a fee type associated with federal court wins.', defaultValue: '$6,500', unit: '$', dataSource: 'Firm-provided (default: $6,500)' },

  // Win Rates (5 stages, no EAJA)
  { id: 'application_win_rate', name: 'Application Win Rate', category: 'Win Rate', description: 'Probability of a favorable decision at the initial application level. Historically the lowest approval rate across all stages.', defaultValue: '36%', unit: '%', dataSource: 'SSA FY2024 national average' },
  { id: 'reconsideration_win_rate', name: 'Reconsideration Win Rate', category: 'Win Rate', description: 'Probability of a favorable decision at reconsideration. Includes cases reviewed by a different examiner than the initial determination.', defaultValue: '14%', unit: '%', dataSource: 'SSA FY2024 national average' },
  { id: 'hearing_win_rate', name: 'ALJ Hearing Win Rate', category: 'Win Rate', description: 'Probability of a favorable decision at the ALJ hearing level. Historically the highest approval rate, as claimants present their case in person.', defaultValue: '54%', unit: '%', dataSource: 'SSA FY2024 national average' },
  { id: 'appeals_council_win_rate', name: 'Appeals Council Win Rate', category: 'Win Rate', description: 'Probability that the Appeals Council grants review and issues a favorable decision or remand. Most requests for review are denied.', defaultValue: '13%', unit: '%', dataSource: 'SSA FY2024 national average' },
  { id: 'federal_court_win_rate', name: 'Federal Court Win Rate', category: 'Win Rate', description: 'Probability of a favorable outcome (reversal or remand) at the federal district court level. Includes sentence-four and sentence-six remands.', defaultValue: '64%', unit: '%', dataSource: 'SSA FY2024 / federal court data' },

  // Adjudication Times (6 stages including EAJA)
  { id: 'application_adj_months', name: 'Application Adj. Time', category: 'Adjudication Time', description: 'Average months from filing an initial application to receiving a determination. Varies by state DDS office workload and complexity.', defaultValue: '8 months', unit: 'months', dataSource: 'SSA FY2024' },
  { id: 'reconsideration_adj_months', name: 'Reconsideration Adj. Time', category: 'Adjudication Time', description: 'Average months from requesting reconsideration to receiving a redetermination. Processed by state DDS offices.', defaultValue: '7 months', unit: 'months', dataSource: 'SSA FY2024' },
  { id: 'hearing_adj_months', name: 'ALJ Hearing Adj. Time', category: 'Adjudication Time', description: 'Average months from requesting a hearing to receiving the ALJ decision. The longest wait at SSA due to hearing backlogs.', defaultValue: '11 months', unit: 'months', dataSource: 'SSA FY2024 / AARP Oct 2025' },
  { id: 'appeals_council_adj_months', name: 'Appeals Council Adj. Time', category: 'Adjudication Time', description: 'Average months from requesting Appeals Council review to receiving a decision or denial of review.', defaultValue: '9 months', unit: 'months', dataSource: 'SSA FY2024 / Atticus June 2024' },
  { id: 'federal_court_adj_months', name: 'Federal Court Adj. Time', category: 'Adjudication Time', description: 'Average months from filing a federal court complaint to receiving a court decision (remand, reversal, or affirmation).', defaultValue: '15 months', unit: 'months', dataSource: 'SSA FY2024 / federal court data' },
  { id: 'eaja_adj_months', name: 'EAJA Adj. Time', category: 'Adjudication Time', description: 'Average months for an EAJA fee petition to be adjudicated after a favorable federal court outcome. Filed separately from the merits case.', defaultValue: '6 months', unit: 'months', dataSource: 'Firm-provided (default: 6)' },

  // Payment Lags (6 stages including EAJA)
  { id: 'application_payment_lag_days', name: 'Application Payment Lag', category: 'Payment Lag', description: 'Days from a favorable application decision to actual receipt of the attorney fee payment. Includes SSA processing and direct-pay timelines.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
  { id: 'reconsideration_payment_lag_days', name: 'Reconsideration Payment Lag', category: 'Payment Lag', description: 'Days from a favorable reconsideration decision to receipt of the attorney fee. Similar processing pipeline as application-level payments.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
  { id: 'hearing_payment_lag_days', name: 'Hearing Payment Lag', category: 'Payment Lag', description: 'Days from a favorable ALJ hearing decision to receipt of the attorney fee. May be longer due to back-pay calculation complexity.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
  { id: 'appeals_council_payment_lag_days', name: 'Appeals Council Payment Lag', category: 'Payment Lag', description: 'Days from a favorable Appeals Council outcome to receipt of the attorney fee. Includes any remand processing time.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
  { id: 'federal_court_payment_lag_days', name: 'Federal Court Payment Lag', category: 'Payment Lag', description: 'Days from a favorable federal court decision to receipt of the attorney fee. Often longest due to remand and subsequent SSA processing.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
  { id: 'eaja_payment_lag_days', name: 'EAJA Payment Lag', category: 'Payment Lag', description: 'Days from a granted EAJA fee petition to receipt of the EAJA payment from the government. Paid separately from Title II fees.', defaultValue: '—', unit: 'days', dataSource: 'Firm-provided' },
];

const CATEGORIES = ['All', 'Firm-Level', 'Fee Per Win', 'Win Rate', 'Adjudication Time', 'Payment Lag'];

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="glossaryArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="glossaryGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#glossaryArcGradient)" strokeWidth="2" opacity="0.5"/>
      <path d="M 25 65 Q 50 20 75 65" stroke="url(#glossaryArcGradient)" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glossaryGlow)"/>
      <circle cx="25" cy="65" r="4" fill="#f59e0b" filter="url(#glossaryGlow)"/>
      <circle cx="50" cy="30" r="5" fill="#eab308" filter="url(#glossaryGlow)"/>
      <circle cx="75" cy="65" r="4" fill="#f59e0b" filter="url(#glossaryGlow)"/>
      {/* Book accent */}
      <rect x="38" y="44" width="24" height="18" rx="2" stroke="url(#glossaryArcGradient)" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <line x1="50" y1="44" x2="50" y2="62" stroke="url(#glossaryArcGradient)" strokeWidth="1" opacity="0.4"/>
    </svg>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  background: 'rgba(15, 15, 25, 0.8)',
  color: '#f8fafc',
  fontSize: '14px',
  outline: 'none',
};

const CATEGORY_COLORS = {
  'Firm-Level': { border: 'rgba(16, 185, 129, 0.3)', bg: 'rgba(16, 185, 129, 0.08)', text: '#6ee7b7' },
  'Fee Per Win': { border: 'rgba(99, 102, 241, 0.3)', bg: 'rgba(99, 102, 241, 0.08)', text: '#a5b4fc' },
  'Win Rate': { border: 'rgba(168, 85, 247, 0.3)', bg: 'rgba(168, 85, 247, 0.08)', text: '#c4b5fd' },
  'Adjudication Time': { border: 'rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.08)', text: '#93c5fd' },
  'Payment Lag': { border: 'rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.08)', text: '#fcd34d' },
};

export default function KpiGlossary() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const contentRef = useRef(null);

  const filtered = useMemo(() => {
    let entries = GLOSSARY_ENTRIES;
    if (activeCategory !== 'All') {
      entries = entries.filter(e => e.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [activeCategory, search]);

  const excelData = useMemo(() => {
    return GLOSSARY_ENTRIES.map(e => ({
      Name: e.name,
      Category: e.category,
      Description: e.description,
      'Default Value': e.defaultValue,
      Unit: e.unit,
      'Data Source': e.dataSource,
    }));
  }, []);

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
        backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.1) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div ref={contentRef} style={{ position: 'relative', zIndex: 1, padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ filter: 'drop-shadow(0 0 30px rgba(245, 158, 11, 0.4))', marginBottom: '16px' }}>
            <BenefitArcLogo size={70} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            KPI Glossary
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Definitions, defaults, and data sources for every KPI used across BenefitArc tools.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }}>
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description..."
              style={{ ...inputStyle, paddingLeft: '40px' }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(99, 102, 241, 0.2)',
                  background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.05)',
                  color: isActive ? '#fcd34d' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Count */}
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Showing {filtered.length} of {GLOSSARY_ENTRIES.length} entries
        </p>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(entry => {
            const colors = CATEGORY_COLORS[entry.category] || { border: 'rgba(99, 102, 241, 0.2)', bg: 'rgba(99, 102, 241, 0.05)', text: '#a5b4fc' };
            return (
              <div key={entry.id} style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
                borderRadius: '14px',
                border: `1px solid ${colors.border}`,
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                    {entry.name}
                  </h3>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px',
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    color: colors.text, fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap',
                  }}>
                    {entry.category}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '14px' }}>
                  {entry.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Default</span>
                    <p style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600', margin: '2px 0 0' }}>{entry.defaultValue}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit</span>
                    <p style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600', margin: '2px 0 0' }}>{entry.unit}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Source</span>
                    <p style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600', margin: '2px 0 0' }}>{entry.dataSource}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: '#64748b', fontSize: '14px',
          }}>
            No entries match your search.
          </div>
        )}

        {/* Export Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <ExportToolbar
            contentRef={contentRef}
            pdfFilename="BenefitArc-KPI-Glossary"
            excelData={excelData}
            excelSheetName="KPI Glossary"
            excelFilename="BenefitArc-KPI-Glossary"
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <a
            href="/kpi-settings"
            style={{
              color: '#f59e0b',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            ← Back to KPI Settings
          </a>
        </div>
      </div>
    </div>
  );
}
