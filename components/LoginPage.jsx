'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useDemo } from './DemoProvider';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const { signIn, signUp, isApproved } = useAuth();
  const { enterDemoMode } = useDemo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    setPendingApproval(false);

    if (isSignUp) {
      const { data, error } = await signUp(email, password);
      if (error) {
        setError('Unable to create account. Please check your details and try again.');
      } else {
        setMessage('Account created! Your request is pending admin approval. You will be notified when approved.');
        setIsSignUp(false);
        setPassword('');
      }
    } else {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError('Invalid email or password.');
      }
      // Note: approval check happens in the parent component
    }

    setLoading(false);
  };

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
        maxWidth: '400px',
        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        padding: '40px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg width={60} height={60} viewBox="0 0 100 100" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
            <defs>
              <linearGradient id="arcGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path d="M20 70 Q50 10 80 70" stroke="url(#arcGradientLogin)" strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="70" r="6" fill="#3b82f6" />
            <circle cx="80" cy="70" r="6" fill="#10b981" />
            <circle cx="50" cy="25" r="8" fill="#6366f1" />
          </svg>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px' }}>
            BenefitArc
          </h1>
          <p style={{ color: '#6366f1', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
            Next‑Gen Forecasting for Next‑Level Advocacy
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => { setIsSignUp(false); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: !isSignUp ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
              color: !isSignUp ? '#f8fafc' : '#94a3b8',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: isSignUp ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
              color: isSignUp ? '#f8fafc' : '#94a3b8',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Request Access
          </button>
        </div>

        {/* Sign Up Info */}
        {isSignUp && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#a5b4fc',
          }}>
            <strong>Note:</strong> New accounts require admin approval before you can access the tools.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(15, 15, 25, 0.8)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(15, 15, 25, 0.8)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
            {isSignUp && (
              <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>
                Minimum 6 characters
              </p>
            )}
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading 
                ? 'rgba(99, 102, 241, 0.3)' 
                : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 30px rgba(99, 102, 241, 0.4)',
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Request Access' : 'Sign In')}
          </button>
        </form>

        {/* Demo Mode Button */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={enterDemoMode}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#f59e0b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Demo -- No Account Needed
          </button>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          color: '#475569',
          fontSize: '11px',
          marginTop: '24px',
        }}>
          All data is processed locally. We never see your financial data.
        </p>
      </div>
    </div>
  );
}
