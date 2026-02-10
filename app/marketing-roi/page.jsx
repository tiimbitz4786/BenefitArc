'use client';

import Link from 'next/link';
import MarketingRoi from '@/components/MarketingRoi';

export default function MarketingRoiPage() {
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
            border: '1px solid rgba(20, 184, 166, 0.3)',
            color: '#14b8a6',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Back to Tools
        </Link>
      </div>

      <MarketingRoi />
    </div>
  );
}
