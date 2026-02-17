'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '🏠', color: '#6366f1' },
  { href: '/kpi-settings', label: 'KPI Settings', icon: '⚙️', color: '#10b981' },
  { href: '/t12-analysis', label: 'T12 Analysis', icon: '📊', color: '#3b82f6' },
  { href: '/steady-state', label: 'Steady State', icon: '📈', color: '#8b5cf6' },
  { href: '/case-pipeline', label: 'Case Pipeline', icon: '📋', color: '#a855f7' },
  { href: '/monte-carlo', label: 'Monte Carlo', icon: '🎲', color: '#ec4899' },
  { href: '/marketing-roi', label: 'Marketing ROI', icon: '📣', color: '#14b8a6' },
  { href: '/firm-settings', label: 'Firm Settings', icon: '🏢', color: '#f59e0b' },
  { href: '/glossary', label: 'Glossary', icon: '📖', color: '#f59e0b' },
];

export default function Sidebar({ firmSettings }) {
  const { user, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('benefitarc-sidebar-collapsed');
      if (saved === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('benefitarc-sidebar-collapsed', String(next)); } catch {}
  };

  const width = collapsed ? 68 : 260;

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const logoSrc = firmSettings?.logo_base64;
  const firmName = firmSettings?.firm_name;
  const accent = firmSettings?.accent_color || '#6366f1';

  return (
    <nav className="sidebar-container" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width,
      background: 'rgba(15, 15, 25, 0.98)',
      borderRight: `1px solid rgba(99,102,241,0.15)`,
      zIndex: 1100, display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo / Brand */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        display: 'flex', alignItems: 'center', gap: '12px',
        minHeight: '72px',
      }}>
        {logoSrc ? (
          <img src={logoSrc} alt="Firm" style={{
            width: 36, height: 36, borderRadius: '8px', objectFit: 'contain',
            flexShrink: 0,
          }} />
        ) : (
          <svg width={36} height={36} viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="sidebarArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor={accent} />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path d="M20 70 Q50 10 80 70" stroke="url(#sidebarArcGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="70" r="6" fill="#3b82f6" />
            <circle cx="80" cy="70" r="6" fill="#10b981" />
            <circle cx="50" cy="25" r="8" fill={accent} />
          </svg>
        )}
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap' }}>
              {firmName || 'BenefitArc'}
            </div>
            {!firmName && (
              <div style={{ fontSize: '10px', color: accent, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                Next-Gen Forecasting
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav Links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: collapsed ? '10px 12px' : '10px 16px',
                borderRadius: '8px', marginBottom: '2px',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                borderLeft: active ? `3px solid ${item.color}` : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative',
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0, width: '24px', textAlign: 'center' }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{
                    fontSize: '13px', fontWeight: active ? '600' : '400',
                    color: active ? '#f8fafc' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User info + collapse toggle */}
      <div style={{
        borderTop: '1px solid rgba(99,102,241,0.1)',
        padding: collapsed ? '12px 8px' : '16px 20px',
      }}>
        {!collapsed && user && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
              {isAdmin && (
                <span style={{
                  padding: '2px 6px', borderRadius: '4px',
                  background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                  color: '#10b981', fontSize: '9px', fontWeight: '600', flexShrink: 0,
                }}>
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={() => signOut()}
              style={{
                background: 'none', border: 'none', color: '#ef4444',
                fontSize: '12px', cursor: 'pointer', padding: 0,
              }}
            >
              Sign Out
            </button>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          style={{
            width: '100%', padding: '8px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '6px', color: '#94a3b8', fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
    </nav>
  );
}
