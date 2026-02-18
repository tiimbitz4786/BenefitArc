'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useDemo } from './DemoProvider';
import LoginPage from './LoginPage';
import PendingApproval from './PendingApproval';
import Sidebar from './Sidebar';
import DemoBanner from './DemoBanner';
import OnboardingWizard from './OnboardingWizard';

export default function AppLayout({ children, firmSettings }) {
  const { user, loading, isApproved, onboardingCompleted } = useAuth();
  const { isDemoMode } = useDemo();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [localOnboardingDone, setLocalOnboardingDone] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('benefitarc-sidebar-collapsed');
      setSidebarCollapsed(saved === 'true');
      setLocalOnboardingDone(localStorage.getItem('benefitarc-onboarding-done') === 'true');
    } catch {}

    const interval = setInterval(() => {
      try {
        const v = localStorage.getItem('benefitarc-sidebar-collapsed') === 'true';
        setSidebarCollapsed(prev => prev !== v ? v : prev);
      } catch {}
    }, 300);

    return () => clearInterval(interval);
  }, []);

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

  const marginLeft = sidebarCollapsed ? 68 : 260;
  const demoBannerHeight = isDemoMode ? 40 : 0;

  return (
    <>
      {isDemoMode && <DemoBanner />}
      {!onboardingCompleted && !localOnboardingDone && !isDemoMode && <OnboardingWizard />}
      <Sidebar firmSettings={firmSettings} />
      <main style={{
        marginLeft,
        marginTop: demoBannerHeight,
        transition: 'margin-left 0.2s ease',
        minHeight: `calc(100vh - ${demoBannerHeight}px)`,
      }}>
        {children}
      </main>
    </>
  );
}
