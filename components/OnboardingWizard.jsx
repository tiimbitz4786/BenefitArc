'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

export default function OnboardingWizard() {
  const { user } = useAuth();
  const [completing, setCompleting] = useState(false);

  const markComplete = async () => {
    if (user?.id && user.id !== 'demo-user-id') {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
  };

  const handleSkip = async () => {
    setCompleting(true);
    await markComplete();
    window.location.reload();
  };

  const handleGoToKpi = async () => {
    setCompleting(true);
    await markComplete();
    window.location.href = '/kpi-settings';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '460px',
        background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.95) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99,102,241,0.3)',
        padding: '40px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>
        <svg width={50} height={50} viewBox="0 0 100 100" fill="none" style={{ margin: '0 auto 20px', display: 'block' }}>
          <defs>
            <linearGradient id="onboardArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path d="M20 70 Q50 10 80 70" stroke="url(#onboardArc)" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="70" r="6" fill="#3b82f6" />
          <circle cx="80" cy="70" r="6" fill="#10b981" />
          <circle cx="50" cy="25" r="8" fill="#6366f1" />
        </svg>

        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
          Welcome to BenefitArc
        </h2>

        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '24px' }}>
          Before you dive into the tools, head to <strong style={{ color: '#10b981' }}>KPI Settings</strong> first.
          That's where you enter your firm's fees, win rates, and timing assumptions.
          Every other tool pulls from those defaults, so you only have to enter them once.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleSkip}
            disabled={completing}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1px solid rgba(99,102,241,0.2)', background: 'transparent',
              color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={handleGoToKpi}
            disabled={completing}
            style={{
              padding: '12px 28px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
              color: 'white', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(16,185,129,0.4)',
            }}
          >
            Go to KPI Settings
          </button>
        </div>
      </div>
    </div>
  );
}
