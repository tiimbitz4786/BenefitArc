'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('BenefitArc error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'rgba(15, 15, 25, 0.95)',
        borderRadius: '20px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        maxWidth: '440px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          ⚠️
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#f8fafc',
          marginBottom: '8px',
        }}>
          Something went wrong
        </h2>
        <p style={{
          fontSize: '13px',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '24px',
        }}>
          An unexpected error occurred. You can try again or return to the home page.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <a
            href="/"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#6366f1',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
