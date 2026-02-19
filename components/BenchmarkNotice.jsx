'use client';

import React from 'react';

export default function BenchmarkNotice({ onDismiss }) {
  const handleDismiss = () => {
    try { localStorage.setItem('benefitarc-benchmark-notice-seen', 'true'); } catch {}
    onDismiss();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1900,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.95) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99,102,241,0.3)',
        padding: '40px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
            <path d="M3 3v18h18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 16l4-6 4 4 5-8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 style={{
          fontSize: '22px', fontWeight: '700', color: '#f8fafc',
          textAlign: 'center', marginBottom: '12px',
        }}>
          Industry Benchmark Program
        </h2>

        <p style={{
          fontSize: '14px', color: '#94a3b8', lineHeight: '1.7',
          textAlign: 'center', marginBottom: '20px',
        }}>
          BenefitArc collects <strong style={{ color: '#c4b5fd' }}>anonymized</strong> KPI
          data to build industry-wide benchmarks for SSD firms. This helps us provide
          better insights and helps you see how your metrics compare.
        </p>

        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: '600', marginBottom: '6px' }}>
            What this means:
          </div>
          <ul style={{
            fontSize: '13px', color: '#94a3b8', lineHeight: '1.8',
            margin: 0, paddingLeft: '18px',
          }}>
            <li>When you save KPIs, an anonymized snapshot is recorded</li>
            <li>No firm name, user ID, or identifying information is stored</li>
            <li>You are opted in by default</li>
            <li>You can opt out anytime in <strong style={{ color: '#c4b5fd' }}>Firm Settings</strong></li>
          </ul>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: 'white', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(99,102,241,0.4)',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
