'use client';

import React from 'react';
import { useDemo } from './DemoProvider';

export default function DemoBanner() {
  const { isDemoMode, exitDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200,
      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
      color: '#1a1a1a', padding: '8px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
      fontSize: '13px', fontWeight: '600',
    }}>
      <span>You're in demo mode -- Sign up to save your work</span>
      <button
        onClick={exitDemoMode}
        style={{
          padding: '4px 14px', borderRadius: '6px',
          background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.2)',
          color: '#1a1a1a', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
        }}
      >
        Exit Demo
      </button>
    </div>
  );
}
