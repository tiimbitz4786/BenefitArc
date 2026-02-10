'use client';

import { useAuth } from '@/components/AuthProvider';
import LoginPage from '@/components/LoginPage';
import PendingApproval from '@/components/PendingApproval';
import Link from 'next/link';

const BenefitArcLogo = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="arcGradientHome" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <path d="M20 70 Q50 10 80 70" stroke="url(#arcGradientHome)" strokeWidth="8" strokeLinecap="round" fill="none" />
    <circle cx="20" cy="70" r="6" fill="#3b82f6" />
    <circle cx="80" cy="70" r="6" fill="#10b981" />
    <circle cx="50" cy="25" r="8" fill="#6366f1" />
  </svg>
);

const ToolCard = ({ title, description, icon, status, href, gradient, features }) => (
  <Link href={href} style={{ textDecoration: 'none' }}>
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
      borderRadius: '20px',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      padding: '28px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: gradient }} />
      <div style={{
        width: '56px', height: '56px', borderRadius: '14px', background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', marginBottom: '20px', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
      }}>{icon}</div>
      {status && (
        <div style={{
          position: 'absolute', top: '20px', right: '20px', padding: '4px 10px', borderRadius: '20px',
          background: status === 'Live' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${status === 'Live' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
          color: status === 'Live' ? '#10b981' : '#f59e0b',
          fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>{status}</div>
      )}
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>{description}</p>
      {features && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {features.map((feature, idx) => (
            <span key={idx} style={{
              padding: '4px 10px', borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc', fontSize: '10px', fontWeight: '500',
            }}>{feature}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '13px', fontWeight: '600' }}>
        Launch Tool <span style={{ fontSize: '16px' }}>→</span>
      </div>
    </div>
  </Link>
);

const ComingSoonCard = ({ title, description }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.6) 0%, rgba(20, 20, 35, 0.5) 100%)',
    borderRadius: '20px', border: '1px dashed rgba(99, 102, 241, 0.2)', padding: '28px', opacity: 0.7,
  }}>
    <div style={{
      width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px',
    }}>🔮</div>
    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>{title}</h3>
    <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>{description}</p>
    <div style={{
      marginTop: '16px', padding: '6px 12px', borderRadius: '6px',
      background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '11px', fontWeight: '500', display: 'inline-block',
    }}>Coming Soon</div>
  </div>
);

export default function Home() {
  const { user, loading, signOut, isApproved, isAdmin } = useAuth();

  if (loading) {
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

  if (!user) {
    return <LoginPage />;
  }

  if (!isApproved) {
    return <PendingApproval />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      
      <div style={{ 
        position: 'absolute', top: '20px', right: '20px', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        {isAdmin && (
          <span style={{
            padding: '4px 10px', borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981', fontSize: '10px', fontWeight: '600',
          }}>
            ADMIN
          </span>
        )}
        <button
          onClick={() => signOut()}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.5))' }}>
              <BenefitArcLogo size={70} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-1px' }}>BenefitArc</h1>
              <p style={{ color: '#6366f1', fontSize: '13px', fontStyle: 'italic', margin: 0, letterSpacing: '0.5px' }}>
                Next‑Gen Forecasting for Next‑Level Advocacy
              </p>
            </div>
          </div>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', margin: '24px auto 0', lineHeight: '1.6' }}>
            Financial analytics and forecasting tools built specifically for Social Security Disability law practices.
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
            Signed in as {user.email}
          </p>
        </header>
        
        <section>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
            Available Tools
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <ToolCard
              title="KPI Settings"
              description="Set your firm's key performance indicators. These values serve as defaults across all BenefitArc tools."
              icon="⚙️" status="Live"
              gradient="linear-gradient(135deg, #10b981 0%, #6366f1 100%)"
              features={['Fee Per Sign-Up', 'Win Rates', 'Fees Per Win', 'Adjudication Times', 'Payment Lag']}
              href="/kpi-settings"
            />
            <ToolCard
              title="T12 P&L Analysis"
              description="Analyze your trailing 12-month Profit & Loss report. Automatically categorizes SS-specific expenses into Marketing, Labor, and Other buckets for benchmarking."
              icon="📊" status="Live" gradient="linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
              features={['QuickBooks Import', 'Auto-Categorization', 'Benchmark Comparison', 'Local Processing']}
              href="/t12-analysis"
            />
            <ToolCard
              title="Steady State Projection"
              description="Model your practice's steady-state economics. Calculate expected revenue, case volume, and profitability at equilibrium based on your intake and case metrics."
              icon="📈" status="Live" gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              features={['Revenue Modeling', '3-Tier Fee Analysis', 'Break-Even Analysis', 'What-If Scenarios']}
              href="/steady-state"
            />
            <ToolCard
              title="Case Pipeline Analyzer"
              description="Analyze your current caseload value. Calculate expected revenue by stage using your average fees and historical win rates."
              icon="📋" status="Live" gradient="linear-gradient(135deg, #a855f7 0%, #d946ef 100%)"
              features={['Pipeline Valuation', 'Stage Analysis', 'Revenue Projections', 'Saved Fee Data']}
              href="/case-pipeline"
            />
            <ToolCard
              title="KPI Glossary"
              description="Definitions, default values, and data sources for every KPI metric used across BenefitArc tools. Searchable and exportable."
              icon="📖" status="Live" gradient="linear-gradient(135deg, #f59e0b 0%, #eab308 100%)"
              features={['Definitions', 'Default Values', 'Data Sources', 'Searchable', 'Export']}
              href="/glossary"
            />
            <ToolCard
              title="Monte Carlo Forecaster"
              description="Upload your case pipeline and run thousands of Monte Carlo simulations to forecast expected revenue with P10/P50/P90 confidence intervals."
              icon="🎲" status="Live" gradient="linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)"
              features={['File Upload', 'PDF OCR', 'Monte Carlo Simulation', 'Confidence Intervals', 'Revenue Timeline']}
              href="/monte-carlo"
            />
          </div>
          
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', marginTop: '48px' }}>
            Coming Soon
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <ComingSoonCard title="Marketing ROI Calculator" description="Measure marketing effectiveness by channel and calculate true cost per signed case." />
            <ComingSoonCard title="Staffing Optimizer" description="Model optimal staffing levels based on caseload, case mix, and productivity targets." />
          </div>
        </section>
        
        <footer style={{ marginTop: '80px', paddingTop: '32px', borderTop: '1px solid rgba(99, 102, 241, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: '12px' }}>BenefitArc Tools • Built for Social Security Disability Practices</p>
          <p style={{ color: '#374151', fontSize: '11px', marginTop: '8px' }}>All data is processed locally in your browser. No data is sent to any server.</p>
        </footer>
      </div>
    </div>
  );
}
