'use client';

import Link from 'next/link';
import SteadyStateProjection from '@/components/SteadyStateProjection';

export default function SteadyStatePage() {
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
      
      <SteadyStateProjection />
    </div>
  );
}
