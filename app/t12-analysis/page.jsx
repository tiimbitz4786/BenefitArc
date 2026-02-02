'use client';

import Link from 'next/link';
import T12Analyzer from '@/components/T12Analyzer';

export default function T12AnalysisPage() {
  return (
    <div>
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
      }}>
        <Link 
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(15, 15, 25, 0.9)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#6366f1',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Back to Tools
        </Link>
      </div>
      
      <T12Analyzer />
    </div>
  );
}
