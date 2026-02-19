'use client';

import React, { useState, useEffect } from 'react';
import { useFirmSettings } from './FirmSettingsProvider';

const ACCENT_PRESETS = [
  { color: '#6366f1', label: 'Indigo' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#10b981', label: 'Emerald' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#14b8a6', label: 'Teal' },
];

export default function FirmSettings() {
  const { firmSettings, firmSettingsLoading, saveFirmSettings } = useFirmSettings();
  const [form, setForm] = useState({ firm_name: '', logo_base64: '', accent_color: '#6366f1', contribute_benchmarks: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firmSettingsLoading) {
      setForm({
        firm_name: firmSettings.firm_name || '',
        logo_base64: firmSettings.logo_base64 || '',
        accent_color: firmSettings.accent_color || '#6366f1',
        contribute_benchmarks: firmSettings.contribute_benchmarks || false,
      });
    }
  }, [firmSettingsLoading, firmSettings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert('Logo file must be under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, logo_base64: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await saveFirmSettings(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (firmSettingsLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#6366f1', fontSize: '14px',
      }}>
        Loading...
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1px solid rgba(99,102,241,0.3)',
    background: 'rgba(15,15,25,0.8)', color: '#f8fafc',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
          Firm Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '32px' }}>
          Customize BenefitArc with your firm's branding. Your logo and name appear in the sidebar and PDF exports.
        </p>

        {/* Firm Name */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
            Firm Name
          </label>
          <input
            type="text"
            value={form.firm_name}
            onChange={e => setForm(prev => ({ ...prev, firm_name: e.target.value }))}
            placeholder="e.g. Smith & Associates"
            style={inputStyle}
          />
        </div>

        {/* Logo Upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
            Firm Logo (PNG/JPG, max 500KB)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {form.logo_base64 && (
              <img src={form.logo_base64} alt="Logo preview" style={{
                width: 64, height: 64, borderRadius: '10px', objectFit: 'contain',
                border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,15,25,0.5)',
              }} />
            )}
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                style={{
                  display: 'inline-block', padding: '8px 16px', borderRadius: '8px',
                  border: '1px solid rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.1)',
                  color: '#a5b4fc', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                }}
              >
                {form.logo_base64 ? 'Change Logo' : 'Upload Logo'}
              </label>
              {form.logo_base64 && (
                <button
                  onClick={() => setForm(prev => ({ ...prev, logo_base64: '' }))}
                  style={{
                    marginLeft: '8px', padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#fca5a5', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Accent Color */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '10px', fontWeight: '500' }}>
            Accent Color
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map(preset => (
              <button
                key={preset.color}
                onClick={() => setForm(prev => ({ ...prev, accent_color: preset.color }))}
                title={preset.label}
                style={{
                  width: 40, height: 40, borderRadius: '10px',
                  background: preset.color, border: 'none', cursor: 'pointer',
                  outline: form.accent_color === preset.color ? '3px solid #f8fafc' : 'none',
                  outlineOffset: '2px',
                  transition: 'outline 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Benchmark Data Sharing */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '10px', fontWeight: '500' }}>
            Benchmark Data Sharing
          </label>
          <div style={{
            background: 'rgba(15, 15, 25, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '16px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500', marginBottom: '4px' }}>
                  Contribute anonymized KPIs to industry benchmarks
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                  When enabled, each time you save your KPI settings an anonymized snapshot
                  (with no identifying information) is recorded to help build industry-wide
                  benchmark data. You can opt out at any time.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev, contribute_benchmarks: !prev.contribute_benchmarks,
                }))}
                style={{
                  flexShrink: 0, width: '48px', height: '26px', borderRadius: '13px',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  background: form.contribute_benchmarks
                    ? 'linear-gradient(135deg, #10b981, #6366f1)'
                    : 'rgba(100, 116, 139, 0.3)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#f8fafc', position: 'absolute', top: '3px',
                  left: form.contribute_benchmarks ? '25px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '14px 28px', borderRadius: '12px', border: 'none',
            background: saving
              ? 'rgba(99,102,241,0.3)'
              : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: 'white', fontSize: '14px', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 0 30px rgba(99,102,241,0.4)',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
