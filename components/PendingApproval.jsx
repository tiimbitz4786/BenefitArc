'use client';

import { useAuth } from './AuthProvider';

export default function PendingApproval() {
  const { user, signOut } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          margin: '0 auto 24px',
        }}>
          ⏳
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginBottom: '12px' }}>
          Pending Approval
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your account has been created, but it's waiting for admin approval. 
          You'll be able to access BenefitArc tools once your account is approved.
        </p>

        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          marginBottom: '24px',
        }}>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>Signed in as</p>
          <p style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500', margin: 0 }}>{user?.email}</p>
        </div>

        <button
          onClick={() => signOut()}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#fca5a5',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
