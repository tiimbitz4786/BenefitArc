'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import ExportToolbar from './ExportToolbar';
import Link from 'next/link';

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mroiArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <filter id="mroiGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#mroiArcGradient)" strokeWidth="2" opacity="0.5"/>
      <path
        d="M 25 65 Q 50 20 75 65"
        stroke="url(#mroiArcGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#mroiGlow)"
      />
      <circle cx="25" cy="65" r="4" fill="#14b8a6" filter="url(#mroiGlow)"/>
      <circle cx="50" cy="30" r="5" fill="#06b6d4" filter="url(#mroiGlow)"/>
      <circle cx="75" cy="65" r="4" fill="#22d3ee" filter="url(#mroiGlow)"/>
      <circle cx="50" cy="50" r="10" stroke="url(#mroiArcGradient)" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="50" cy="50" r="4" fill="url(#mroiArcGradient)" opacity="0.5"/>
    </svg>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(20, 184, 166, 0.3)',
  background: 'rgba(15, 15, 25, 0.8)',
  color: '#f8fafc',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const EMPTY_FORM = {
  name: '',
  dateStart: '',
  dateEnd: '',
  spend: '',
  leads: '',
  wanted: '',
  signed: '',
};

function formatCurrency(val) {
  if (val == null || !isFinite(val)) return '—';
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateRange(start, end) {
  if (!start && !end) return '—';
  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function costPer(spend, count) {
  const s = parseFloat(spend);
  const c = parseFloat(count);
  if (!s || !c || c === 0) return null;
  return s / c;
}

function ratePct(numerator, denominator) {
  const n = parseFloat(numerator);
  const d = parseFloat(denominator);
  if (isNaN(n) || isNaN(d) || d === 0) return null;
  return (n / d) * 100;
}

function formatPct(val) {
  if (val == null || !isFinite(val)) return '—';
  return val.toFixed(1) + '%';
}

export default function MarketingRoi() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowIdx, field }
  const [editValue, setEditValue] = useState('');
  const contentRef = useRef(null);

  const validate = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    const spend = parseFloat(form.spend);
    if (!form.spend || isNaN(spend) || spend <= 0) errs.spend = 'Must be > 0';
    const leads = parseInt(form.leads) || 0;
    const wanted = parseInt(form.wanted) || 0;
    const signed = parseInt(form.signed) || 0;
    if (leads <= 0 && wanted <= 0 && signed <= 0) {
      errs.leads = 'At least one metric > 0';
      errs.wanted = ' ';
      errs.signed = ' ';
    }
    return errs;
  }, [form]);

  const handleAdd = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setCampaigns(prev => [...prev, {
      id: Date.now(),
      name: form.name.trim(),
      dateStart: form.dateStart,
      dateEnd: form.dateEnd,
      spend: parseFloat(form.spend),
      leads: parseInt(form.leads) || 0,
      wanted: parseInt(form.wanted) || 0,
      signed: parseInt(form.signed) || 0,
    }]);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    // Clear the grouped validation error for leads/wanted/signed
    if (['leads', 'wanted', 'signed'].includes(field)) {
      setErrors(prev => { const n = { ...prev }; delete n.leads; delete n.wanted; delete n.signed; return n; });
    }
  };

  // Edit-in-place handlers
  const startEdit = (rowIdx, field, currentValue) => {
    setEditingCell({ rowIdx, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { rowIdx, field } = editingCell;
    setCampaigns(prev => {
      const updated = [...prev];
      const campaign = { ...updated[rowIdx] };
      if (field === 'name') {
        const v = editValue.trim();
        if (v) campaign.name = v;
      } else if (field === 'spend') {
        const v = parseFloat(editValue);
        if (v > 0) campaign.spend = v;
      } else if (field === 'dateStart' || field === 'dateEnd') {
        campaign[field] = editValue;
      } else {
        const v = parseInt(editValue);
        if (!isNaN(v) && v >= 0) campaign[field] = v;
      }
      updated[rowIdx] = campaign;
      return updated;
    });
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // Totals
  const totals = useMemo(() => {
    const t = { spend: 0, leads: 0, wanted: 0, signed: 0 };
    campaigns.forEach(c => {
      t.spend += c.spend;
      t.leads += c.leads;
      t.wanted += c.wanted;
      t.signed += c.signed;
    });
    return t;
  }, [campaigns]);

  // Excel data
  const excelData = useMemo(() => {
    return campaigns.map(c => ({
      'Campaign Name': c.name,
      'Date Start': c.dateStart || '',
      'Date End': c.dateEnd || '',
      'Spend': c.spend,
      'Leads': c.leads,
      'Wanted': c.wanted,
      'Signed': c.signed,
      'Cost Per Lead': costPer(c.spend, c.leads) ?? '',
      'Cost Per Wanted': costPer(c.spend, c.wanted) ?? '',
      'Cost Per Signed': costPer(c.spend, c.signed) ?? '',
      'Wanted Rate (%)': ratePct(c.wanted, c.leads) != null ? ratePct(c.wanted, c.leads).toFixed(1) : '',
      'Conversion Rate (%)': ratePct(c.signed, c.signed + c.wanted) != null ? ratePct(c.signed, c.signed + c.wanted).toFixed(1) : '',
      'Sign Rate (%)': ratePct(c.signed, c.leads) != null ? ratePct(c.signed, c.leads).toFixed(1) : '',
    }));
  }, [campaigns]);

  const renderEditableCell = (rowIdx, field, displayValue, rawValue, type = 'text') => {
    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          style={{
            ...inputStyle,
            padding: '4px 8px',
            fontSize: '12px',
            width: type === 'date' ? '140px' : '80px',
            border: '1px solid rgba(6, 182, 212, 0.5)',
          }}
        />
      );
    }
    return (
      <span
        onClick={() => startEdit(rowIdx, field, rawValue)}
        style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(20, 184, 166, 0.3)', paddingBottom: '1px' }}
        title="Click to edit"
      >
        {displayValue}
      </span>
    );
  };

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(20, 184, 166, 0.15)',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '10px 12px',
    fontSize: '13px',
    color: '#f1f5f9',
    borderBottom: '1px solid rgba(20, 184, 166, 0.08)',
    whiteSpace: 'nowrap',
  };

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
        backgroundImage: 'linear-gradient(rgba(20, 184, 166, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div ref={contentRef} style={{ position: 'relative', zIndex: 1, padding: '40px 24px', maxWidth: '1300px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ filter: 'drop-shadow(0 0 30px rgba(20, 184, 166, 0.4))', marginBottom: '16px' }}>
            <BenefitArcLogo size={70} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            Marketing ROI Calculator
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Track campaign performance and calculate cost per lead, cost per wanted, and cost per signed.
          </p>
        </div>

        {/* Input Form */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(20, 184, 166, 0.2)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 20px 0' }}>
            Add Campaign
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Campaign Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Campaign Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="e.g. Google Ads Q1"
                style={{ ...inputStyle, borderColor: errors.name ? 'rgba(239, 68, 68, 0.5)' : undefined }}
              />
              {errors.name && <span style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </div>

            {/* Date Start */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Date Start
              </label>
              <input
                type="date"
                value={form.dateStart}
                onChange={(e) => handleFormChange('dateStart', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Date End */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Date End
              </label>
              <input
                type="date"
                value={form.dateEnd}
                onChange={(e) => handleFormChange('dateEnd', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Spend */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Spend ($)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.spend}
                  onChange={(e) => handleFormChange('spend', e.target.value)}
                  placeholder="e.g. 5000"
                  style={{ ...inputStyle, paddingLeft: '28px', borderColor: errors.spend ? 'rgba(239, 68, 68, 0.5)' : undefined }}
                />
              </div>
              {errors.spend && <span style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{errors.spend}</span>}
            </div>

            {/* Leads */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Leads
              </label>
              <input
                type="number"
                min="0"
                value={form.leads}
                onChange={(e) => handleFormChange('leads', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, borderColor: errors.leads ? 'rgba(239, 68, 68, 0.5)' : undefined }}
              />
              {errors.leads && errors.leads !== ' ' && <span style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{errors.leads}</span>}
            </div>

            {/* Wanted */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Wanted
              </label>
              <input
                type="number"
                min="0"
                value={form.wanted}
                onChange={(e) => handleFormChange('wanted', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, borderColor: errors.wanted ? 'rgba(239, 68, 68, 0.5)' : undefined }}
              />
            </div>

            {/* Signed */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                Signed
              </label>
              <input
                type="number"
                min="0"
                value={form.signed}
                onChange={(e) => handleFormChange('signed', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, borderColor: errors.signed ? 'rgba(239, 68, 68, 0.5)' : undefined }}
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            style={{
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)',
            }}
          >
            Add Campaign
          </button>
        </div>

        {/* Campaign Table */}
        {campaigns.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            padding: '24px',
            marginBottom: '24px',
            overflowX: 'auto',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 16px 0' }}>
              Campaigns ({campaigns.length})
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Campaign</th>
                  <th style={thStyle}>Date Range</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Spend</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Wanted</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Signed</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CPL</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CPW</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CPS</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Wanted %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Conv %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Sign %</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, idx) => (
                  <tr key={c.id} style={{ transition: 'background 0.15s' }}>
                    <td style={tdStyle}>
                      {renderEditableCell(idx, 'name', c.name, c.name)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#94a3b8' }}>
                      <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {renderEditableCell(idx, 'dateStart', c.dateStart ? new Date(c.dateStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', c.dateStart, 'date')}
                        <span>–</span>
                        {renderEditableCell(idx, 'dateEnd', c.dateEnd ? new Date(c.dateEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', c.dateEnd, 'date')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {renderEditableCell(idx, 'spend', formatCurrency(c.spend), c.spend, 'number')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {renderEditableCell(idx, 'leads', c.leads.toLocaleString(), c.leads, 'number')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {renderEditableCell(idx, 'wanted', c.wanted.toLocaleString(), c.wanted, 'number')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {renderEditableCell(idx, 'signed', c.signed.toLocaleString(), c.signed, 'number')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#5eead4' }}>
                      {formatCurrency(costPer(c.spend, c.leads))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#67e8f9' }}>
                      {formatCurrency(costPer(c.spend, c.wanted))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#2dd4bf' }}>
                      {formatCurrency(costPer(c.spend, c.signed))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#a5b4fc' }}>
                      {formatPct(ratePct(c.wanted, c.leads))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#c4b5fd' }}>
                      {formatPct(ratePct(c.signed, c.signed + c.wanted))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#fbbf24' }}>
                      {formatPct(ratePct(c.signed, c.leads))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        title="Delete campaign"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Cards */}
        {campaigns.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {[
              { label: 'Total Spend', value: formatCurrency(totals.spend), color: '#f8fafc' },
              { label: 'Total Leads', value: totals.leads.toLocaleString(), color: '#5eead4' },
              { label: 'Total Wanted', value: totals.wanted.toLocaleString(), color: '#67e8f9' },
              { label: 'Total Signed', value: totals.signed.toLocaleString(), color: '#2dd4bf' },
              { label: 'Blended CPL', value: formatCurrency(costPer(totals.spend, totals.leads)), color: '#5eead4' },
              { label: 'Blended CPW', value: formatCurrency(costPer(totals.spend, totals.wanted)), color: '#67e8f9' },
              { label: 'Blended CPS', value: formatCurrency(costPer(totals.spend, totals.signed)), color: '#2dd4bf' },
              { label: 'Wanted Rate', value: formatPct(ratePct(totals.wanted, totals.leads)), color: '#a5b4fc' },
              { label: 'Conversion Rate', value: formatPct(ratePct(totals.signed, totals.signed + totals.wanted)), color: '#c4b5fd' },
              { label: 'Sign Rate', value: formatPct(ratePct(totals.signed, totals.leads)), color: '#fbbf24' },
            ].map((card, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
                borderRadius: '14px',
                border: '1px solid rgba(20, 184, 166, 0.15)',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '600' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: card.color, letterSpacing: '-0.5px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export Toolbar */}
        {campaigns.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <ExportToolbar
              contentRef={contentRef}
              pdfFilename="BenefitArc-Marketing-ROI"
              excelData={excelData}
              excelSheetName="Marketing ROI"
              excelFilename="BenefitArc-Marketing-ROI"
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              color: '#14b8a6',
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
