import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, Cell, PieChart, Pie } from 'recharts';
import { useKpis } from './KpiProvider';
import ExportToolbar from './ExportToolbar';

// ============================================
// REVENUE FORECAST MODEL - SETUP WIZARD v2
// Comprehensive data collection with validation
// ============================================

// Get current date info
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1;
const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3);

// Years to collect data for (3 full years + current year if past Q1)
const DATA_YEARS = [
  CURRENT_YEAR - 3,
  CURRENT_YEAR - 2,
  CURRENT_YEAR - 1,
  ...(CURRENT_QUARTER >= 2 ? [CURRENT_YEAR] : [])
];

// Default timing assumptions (months from sign-up)
const DEFAULT_TIMING = {
  application: 6,
  reconsideration: 12,
  hearing: 26,
  appealsCouncil: 38,
  federalCourt: 56,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function RevenueForecastSetup() {
  const { kpis, kpisLoading } = useKpis();
  const [step, setStep] = useState(0); // 0 = welcome/security, 1-4 = data entry, 5 = results
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const contentRef = useRef(null);
  const [firmData, setFirmData] = useState({
    firmName: '',
    // Revenue by level by year
    revenueByLevel: DATA_YEARS.reduce((acc, year) => ({
      ...acc,
      [year]: {
        application: '',
        reconsideration: '',
        hearing: '',
        appealsCouncil: '',
        eaja: '',
        fee406a: '',
        fee406b: '',
      }
    }), {}),
    // Events by year
    eventsByYear: DATA_YEARS.reduce((acc, year) => ({
      ...acc,
      [year]: {
        signUps: '',
        applicationsFiled: '',
        requestsForRecon: '',
        requestsForHearing: '',
        hearingsHeld: '',
        acAppeals: '',
        usdcComplaints: '',
        usdcRemands: '',
        casesWon: '', // Total cases won (generated a fee)
      }
    }), {}),
    // User-provided closed no fee % (if they know it)
    closedNoFeePercent: '',
    // Recent monthly intake (last 3 months)
    recentMonthlyIntake: {
      month1: '', // Most recent month
      month2: '', // 2 months ago
      month3: '', // 3 months ago
    },
  });
  
  // Pre-populate closedNoFeePercent from KPI Settings if user hasn't entered one
  useEffect(() => {
    if (kpisLoading) return;
    if (firmData.closedNoFeePercent === '' && kpis.closed_no_fee_percent && kpis.closed_no_fee_percent !== '') {
      setFirmData(prev => ({ ...prev, closedNoFeePercent: kpis.closed_no_fee_percent.toString() }));
    }
  }, [kpisLoading]);

  // Track which years have data
  const dataCompleteness = useMemo(() => {
    const completeness = {};
    DATA_YEARS.forEach(year => {
      const revenue = firmData.revenueByLevel[year] || {};
      const events = firmData.eventsByYear[year] || {};
      
      const revenueFields = Object.values(revenue).filter(v => v && parseFloat(v) > 0).length;
      const eventFields = Object.values(events).filter(v => v && parseInt(v) > 0).length;
      
      completeness[year] = {
        revenue: revenueFields,
        events: eventFields,
        total: revenueFields + eventFields,
        complete: revenueFields >= 3 && eventFields >= 4, // Minimum thresholds
      };
    });
    return completeness;
  }, [firmData]);
  
  const yearsWithData = useMemo(() => {
    return DATA_YEARS.filter(year => dataCompleteness[year]?.complete);
  }, [dataCompleteness]);
  
  // Calculate derived metrics
  const calculatedMetrics = useMemo(() => {
    const metrics = {
      // Core metrics
      avgFeePerWin: 0,
      avgFeePerWinSource: 'none',
      closedNoFeePercent: 0,
      closedNoFeeSource: 'none',
      estimatedClosedNoFee: 0, // Funnel-based estimate (for anchoring)
      avgFeePerSignUp: 0,
      // EAJA metrics
      eajaRate: 0,
      eajaPerRemand: 0,
      // Conversion rates at each stage
      conversionRates: {},
      // Revenue distribution by level (for internal weighting only)
      revenuePerLevel: {},
      // Steady state projections
      steadyState: {},
    };
    
    // Calculate totals across years with data
    const levelTotals = {
      application: 0,
      reconsideration: 0,
      hearing: 0,
      appealsCouncil: 0,
      eaja: 0,
      fee406a: 0,
      fee406b: 0,
    };
    
    const eventTotals = {
      signUps: 0,
      applicationsFiled: 0,
      requestsForRecon: 0,
      requestsForHearing: 0,
      hearingsHeld: 0,
      acAppeals: 0,
      usdcComplaints: 0,
      usdcRemands: 0,
      casesWon: 0,
    };
    
    yearsWithData.forEach(year => {
      const revenue = firmData.revenueByLevel[year] || {};
      const events = firmData.eventsByYear[year] || {};
      
      Object.keys(levelTotals).forEach(key => {
        levelTotals[key] += parseFloat(revenue[key]) || 0;
      });
      
      Object.keys(eventTotals).forEach(key => {
        eventTotals[key] += parseInt(events[key]) || 0;
      });
    });
    
    const totalRevenue = Object.values(levelTotals).reduce((sum, v) => sum + v, 0);
    const totalEaja = levelTotals.eaja;
    const totalRemands = eventTotals.usdcRemands;
    const totalCasesWon = eventTotals.casesWon;
    const totalSignUps = eventTotals.signUps;
    
    // ===== TIER 1: AVG FEE PER WIN =====
    // Calculate from Total Cases Won (if provided)
    if (totalCasesWon > 0 && totalRevenue > 0) {
      metrics.avgFeePerWin = totalRevenue / totalCasesWon;
      metrics.avgFeePerWinSource = 'calculated';
    }
    
    // ===== TIER 2: ESTIMATE CLOSED NO FEE % FROM FUNNEL =====
    // Identify definite losses (cases that clearly generated no fee)
    let definiteLosses = 0;
    
    // Cases that never filed an application (dropped before starting)
    if (eventTotals.signUps > 0 && eventTotals.applicationsFiled > 0) {
      definiteLosses += Math.max(0, eventTotals.signUps - eventTotals.applicationsFiled);
    }
    
    // Cases that went to USDC but didn't get remanded (lost at federal court)
    if (eventTotals.usdcComplaints > 0 && eventTotals.usdcRemands >= 0) {
      definiteLosses += Math.max(0, eventTotals.usdcComplaints - eventTotals.usdcRemands);
    }
    
    // Calculate minimum closed no fee % from definite losses
    if (totalSignUps > 0 && definiteLosses > 0) {
      metrics.estimatedClosedNoFee = (definiteLosses / totalSignUps) * 100;
    }
    
    // ===== DETERMINE CLOSED NO FEE % =====
    // Priority: User-provided > Funnel estimate
    if (firmData.closedNoFeePercent && parseFloat(firmData.closedNoFeePercent) > 0) {
      metrics.closedNoFeePercent = parseFloat(firmData.closedNoFeePercent);
      metrics.closedNoFeeSource = 'user_provided';
    } else if (metrics.estimatedClosedNoFee > 0) {
      // Use funnel estimate as minimum, but it's likely higher
      // Add a reasonable buffer since we only captured "definite" losses
      metrics.closedNoFeePercent = Math.min(metrics.estimatedClosedNoFee * 1.5, 50); // Cap at 50%
      metrics.closedNoFeeSource = 'estimated_from_funnel';
    }
    
    // ===== CALCULATE AVG FEE PER SIGN-UP =====
    if (metrics.avgFeePerWin > 0 && metrics.closedNoFeePercent > 0) {
      metrics.avgFeePerSignUp = metrics.avgFeePerWin * (1 - metrics.closedNoFeePercent / 100);
    } else if (metrics.avgFeePerWin > 0) {
      // No closed no fee data - can't calculate accurately
      metrics.avgFeePerSignUp = 0;
    }
    
    // ===== EAJA PER REMAND =====
    if (totalRemands > 0 && totalEaja > 0) {
      metrics.eajaPerRemand = totalEaja / totalRemands;
    }
    
    // ===== EAJA RATE =====
    if (totalSignUps > 0 && totalRemands > 0) {
      const lagAdjustedSignUps = totalSignUps * (yearsWithData.length / (yearsWithData.length + 1));
      metrics.eajaRate = Math.min((totalRemands / lagAdjustedSignUps) * 100, 25);
    }
    
    // ===== CONVERSION RATES =====
    if (eventTotals.applicationsFiled > 0) {
      metrics.conversionRates = {
        signUpToApp: eventTotals.applicationsFiled / eventTotals.signUps * 100 || 0,
        applicationToRecon: eventTotals.requestsForRecon / eventTotals.applicationsFiled * 100 || 0,
        reconToHearing: eventTotals.requestsForHearing / eventTotals.requestsForRecon * 100 || 0,
        hearingToAC: eventTotals.acAppeals / eventTotals.hearingsHeld * 100 || 0,
        acToUSC: eventTotals.usdcComplaints / eventTotals.acAppeals * 100 || 0,
        usdcRemandRate: eventTotals.usdcRemands / eventTotals.usdcComplaints * 100 || 0,
      };
    }
    
    // ===== REVENUE DISTRIBUTION BY LEVEL =====
    if (totalRevenue > 0) {
      metrics.revenuePerLevel = {
        application: (levelTotals.application / totalRevenue * 100) || 0,
        reconsideration: (levelTotals.reconsideration / totalRevenue * 100) || 0,
        hearing: (levelTotals.hearing / totalRevenue * 100) || 0,
        appealsCouncil: (levelTotals.appealsCouncil / totalRevenue * 100) || 0,
        federal: ((levelTotals.eaja + levelTotals.fee406a + levelTotals.fee406b) / totalRevenue * 100) || 0,
      };
    }
    
    // ===== STEADY STATE CALCULATIONS =====
    const month1 = parseInt(firmData.recentMonthlyIntake.month1) || 0;
    const month2 = parseInt(firmData.recentMonthlyIntake.month2) || 0;
    const month3 = parseInt(firmData.recentMonthlyIntake.month3) || 0;
    const monthsWithData = [month1, month2, month3].filter(m => m > 0);
    const avgMonthlyIntake = monthsWithData.length > 0 
      ? Math.round(monthsWithData.reduce((sum, m) => sum + m, 0) / monthsWithData.length)
      : 0;
    const annualIntake = avgMonthlyIntake * 12;
    
    const canProject = metrics.avgFeePerSignUp > 0;
    
    metrics.steadyState = {
      annualIntake,
      monthlyIntake: avgMonthlyIntake,
      annualRevenue: canProject ? annualIntake * metrics.avgFeePerSignUp : 0,
      annualEaja: (metrics.eajaPerRemand > 0 && metrics.eajaRate > 0) 
        ? annualIntake * (metrics.eajaRate / 100) * metrics.eajaPerRemand 
        : 0,
      eajaRemands: metrics.eajaRate > 0 ? Math.round(annualIntake * (metrics.eajaRate / 100)) : 0,
      canProject,
    };
    
    return metrics;
  }, [firmData, yearsWithData]);
  
  // Generate projections
  const projections = useMemo(() => {
    const month1 = parseInt(firmData.recentMonthlyIntake.month1) || 0;
    const month2 = parseInt(firmData.recentMonthlyIntake.month2) || 0;
    const month3 = parseInt(firmData.recentMonthlyIntake.month3) || 0;
    const monthsWithData = [month1, month2, month3].filter(m => m > 0);
    
    if (monthsWithData.length === 0) return [];
    if (!calculatedMetrics.steadyState.canProject) return []; // Can't project without avg fee per case
    
    const avgMonthlyIntake = Math.round(monthsWithData.reduce((sum, m) => sum + m, 0) / monthsWithData.length);
    const projectedAnnualIntake = avgMonthlyIntake * 12;
    
    const results = [];
    
    // Build intake history from historical data
    const intakeByYear = {};
    DATA_YEARS.forEach(year => {
      const events = firmData.eventsByYear[year] || {};
      intakeByYear[year] = parseInt(events.signUps) || 0;
    });
    
    // Project future years using average monthly intake
    for (let y = CURRENT_YEAR; y <= CURRENT_YEAR + 5; y++) {
      if (!intakeByYear[y] || intakeByYear[y] === 0) {
        intakeByYear[y] = projectedAnnualIntake;
      }
    }
    
    // Fill gaps with interpolation or nearest known value
    for (let y = CURRENT_YEAR - 5; y <= CURRENT_YEAR + 5; y++) {
      if (!intakeByYear[y]) {
        const knownYears = Object.keys(intakeByYear).map(Number).filter(yr => intakeByYear[yr] > 0);
        if (knownYears.length > 0) {
          const nearest = knownYears.reduce((prev, curr) => 
            Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
          );
          intakeByYear[y] = intakeByYear[nearest];
        }
      }
    }
    
    // Revenue timing weights based on user data or defaults
    const weights = [
      { offset: 0, weight: calculatedMetrics.revenuePerLevel.application / 100 || 0.10 },
      { offset: -1, weight: calculatedMetrics.revenuePerLevel.reconsideration / 100 || 0.10 },
      { offset: -2, weight: calculatedMetrics.revenuePerLevel.hearing / 100 || 0.40 },
      { offset: -3, weight: (calculatedMetrics.revenuePerLevel.appealsCouncil / 100) || 0.20 },
      { offset: -4, weight: (calculatedMetrics.revenuePerLevel.federal / 100) || 0.20 },
    ];
    
    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    weights.forEach(w => w.weight = w.weight / totalWeight);
    
    for (let year = CURRENT_YEAR - 1; year <= CURRENT_YEAR + 5; year++) {
      let weightedIntake = 0;
      weights.forEach(({ offset, weight }) => {
        const sourceYear = year + offset;
        weightedIntake += (intakeByYear[sourceYear] || 0) * weight;
      });
      
      const revenue = weightedIntake * calculatedMetrics.avgFeePerSignUp;
      const actualRevenue = getTotalRevenue(firmData.revenueByLevel[year]);
      
      results.push({
        year: String(year),
        revenue: actualRevenue > 0 ? actualRevenue : revenue,
        projectedRevenue: revenue,
        weightedIntake: Math.round(weightedIntake),
        intake: intakeByYear[year] || 0,
        isActual: actualRevenue > 0,
        pctSteady: calculatedMetrics.steadyState.annualRevenue > 0 
          ? Math.min(Math.round((revenue / calculatedMetrics.steadyState.annualRevenue) * 100), 100) 
          : 0,
      });
    }
    
    return results;
  }, [firmData, calculatedMetrics]);

  const forecastExcelData = useMemo(() => projections.map(p => ({
    Year: p.year,
    Intake: p.intake,
    'Weighted Source': p.weightedIntake,
    Revenue: Math.round(p.revenue),
    '% Steady': `${p.pctSteady}%`,
  })), [projections]);

  const formatCurrency = (v) => {
    if (v === 0 || !v) return '$0';
    if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`;
    return `$${Math.round(v)}`;
  };
  
  const formatFull = (v) => new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD', maximumFractionDigits: 0 
  }).format(v || 0);

  // ============================================
  // STEP 0: WELCOME & DATA SECURITY
  // ============================================
  const renderStep0 = () => (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          width: '80px', height: '80px', 
          margin: '0 auto 16px',
          filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.5))',
        }}>
          <BenefitArcLogo size={80} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#f8fafc', marginBottom: '2px', letterSpacing: '-0.5px' }}>
          BenefitArc
        </h1>
        <p style={{ color: '#6366f1', fontSize: '11px', fontStyle: 'italic', marginBottom: '20px', letterSpacing: '0.5px' }}>
          Next‑Gen Forecasting for Next‑Level Advocacy
        </p>
        <div style={{ 
          display: 'inline-block',
          padding: '8px 20px', 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.2), inset 0 0 20px rgba(99, 102, 241, 0.1)',
        }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '15px', 
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}>
            Steady State Projection
          </span>
        </div>
      </div>
      
      <div style={{ 
        padding: '20px', 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>📄</div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
              How This Model Works
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
              The Steady State Projection Model calculates your practice's long-term economic equilibrium 
              based on intake rates, case lifecycles, win rates, and fee structures.
            </p>
            <a 
              href="/steady-state/white-paper"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontSize: '12px',
                fontWeight: '600',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Read the White Paper →
            </a>
          </div>
        </div>
      </div>
      
      <div style={{ 
        padding: '20px', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>🔒</div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1', marginBottom: '8px' }}>
              Data Security & Privacy
            </h3>
            <ul style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.8', margin: 0, paddingLeft: '16px' }}>
              <li>All data is processed locally in your browser</li>
              <li>No data is transmitted to external servers</li>
              <li>Data is not stored permanently—it will be cleared when you close this page</li>
              <li>You can clear all entered data at any time using the reset button</li>
              <li>We recommend not entering any personally identifiable client information</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1', marginBottom: '12px' }}>
          What You'll Need
        </h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
          For the most accurate forecast, gather data for the past 3 years ({DATA_YEARS.join(', ')}):
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: '500', marginBottom: '4px' }}>Revenue by Level</div>
            <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
              <li>Application</li>
              <li>Reconsideration</li>
              <li>Hearing</li>
              <li>Appeals Council</li>
              <li>EAJA / 406A / 406B</li>
            </ul>
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: '500', marginBottom: '4px' }}>Case Events</div>
            <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
              <li>Sign-ups</li>
              <li>Applications Filed</li>
              <li>Hearings Held</li>
              <li>USDC Complaints & Remands</li>
              <li>Total Cases Won</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        marginBottom: '24px',
        fontSize: '12px',
        color: '#fbbf24',
      }}>
        <strong>Note:</strong> If you don't have all this data, that's okay! The model will work with 
        whatever you provide, but predictions will be more accurate with more complete data.
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dataConfirmed}
            onChange={(e) => setDataConfirmed(e.target.checked)}
            style={{ marginTop: '3px', accentColor: '#6366f1' }}
          />
          <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
            I understand that this tool processes data locally, does not store data permanently, 
            and I will not enter any personally identifiable client information.
          </span>
        </label>
      </div>
      
      <button
        onClick={() => setStep(1)}
        disabled={!dataConfirmed}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          background: dataConfirmed 
            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' 
            : 'rgba(99, 102, 241, 0.2)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          cursor: dataConfirmed ? 'pointer' : 'not-allowed',
          boxShadow: dataConfirmed ? '0 0 30px rgba(99, 102, 241, 0.4)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        Get Started →
      </button>
    </div>
  );

  // ============================================
  // STEP 1: FIRM INFO & RECENT INTAKE
  // ============================================
  const renderStep1 = () => {
    const month1 = parseInt(firmData.recentMonthlyIntake.month1) || 0;
    const month2 = parseInt(firmData.recentMonthlyIntake.month2) || 0;
    const month3 = parseInt(firmData.recentMonthlyIntake.month3) || 0;
    const monthsWithData = [month1, month2, month3].filter(m => m > 0);
    const hasRecentIntake = monthsWithData.length > 0;
    const avgMonthlyIntake = hasRecentIntake 
      ? Math.round(monthsWithData.reduce((sum, m) => sum + m, 0) / monthsWithData.length)
      : 0;
    
    // Calculate the last 3 month names
    const getMonthName = (monthsAgo) => {
      const date = new Date(TODAY.getFullYear(), TODAY.getMonth() - monthsAgo, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };
    
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <StepHeader 
          step={1} 
          title="Firm Information & Current Intake" 
          description="Basic information about your firm and your recent case volume."
        />
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
            Firm Name (optional, for display purposes only)
          </label>
          <input
            type="text"
            value={firmData.firmName}
            onChange={(e) => setFirmData({ ...firmData, firmName: e.target.value })}
            placeholder="Your Firm Name"
            style={inputStyle}
          />
        </div>
        
        {/* Why We Need Recent Intake */}
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>📈</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '6px' }}>
                Why Current Intake Matters
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                Social Security disability cases take <strong style={{ color: '#e2e8f0' }}>2-5 years</strong> to 
                generate revenue. Cases you sign today won't produce significant fees until they reach 
                hearings (2 years) or federal court (4-5 years). Your current intake determines your 
                <strong style={{ color: '#10b981' }}> future steady-state revenue</strong>—what you'll earn 
                once today's cases mature through the system.
              </p>
            </div>
          </div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '24px',
        }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', fontWeight: '600', marginBottom: '12px' }}>
            Monthly Intake - Last 3 Months (Cases Signed) *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '4px', textAlign: 'center', fontWeight: '600' }}>
                {getMonthName(1)}
              </div>
              <input
                type="number"
                value={firmData.recentMonthlyIntake.month1}
                onChange={(e) => setFirmData({
                  ...firmData,
                  recentMonthlyIntake: { ...firmData.recentMonthlyIntake, month1: e.target.value }
                })}
                placeholder="0"
                style={{ 
                  ...inputStyle, 
                  width: '100%', 
                  textAlign: 'center',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                {getMonthName(2)}
              </div>
              <input
                type="number"
                value={firmData.recentMonthlyIntake.month2}
                onChange={(e) => setFirmData({
                  ...firmData,
                  recentMonthlyIntake: { ...firmData.recentMonthlyIntake, month2: e.target.value }
                })}
                placeholder="0"
                style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                {getMonthName(3)}
              </div>
              <input
                type="number"
                value={firmData.recentMonthlyIntake.month3}
                onChange={(e) => setFirmData({
                  ...firmData,
                  recentMonthlyIntake: { ...firmData.recentMonthlyIntake, month3: e.target.value }
                })}
                placeholder="0"
                style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
              />
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
            Enter the number of new cases signed each month. The model will use the average as your projected intake.
          </p>
        </div>
        
        {/* Intake Preview */}
        {hasRecentIntake && (
          <div style={{
            padding: '14px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '2px' }}>
                  Average Monthly Intake
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Based on {monthsWithData.length} month{monthsWithData.length > 1 ? 's' : ''} of data
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {avgMonthlyIntake}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>cases/month</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Fine print caveat */}
        <div style={{ 
          padding: '10px 12px', 
          backgroundColor: 'rgba(30, 41, 59, 0.3)', 
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '10px',
          color: '#64748b',
          lineHeight: '1.5',
        }}>
          <strong>Note:</strong> Projections assume intake remains stable at the current average ({avgMonthlyIntake || '—'} cases/month). 
          Significant changes in monthly intake—whether growth or decline—will affect future revenue projections. 
          We recommend updating this model quarterly to reflect changes in intake volume.
        </div>
        
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'rgba(30, 41, 59, 0.5)', 
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '12px',
          color: '#94a3b8',
        }}>
          <strong style={{ color: '#e2e8f0' }}>Today's Date:</strong> {TODAY.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}
          <br />
          <strong style={{ color: '#e2e8f0' }}>Historical data requested for:</strong> {DATA_YEARS.join(', ')}
        </div>
        
        <NavigationButtons onBack={() => setStep(0)} onNext={() => setStep(2)} canProceed={hasRecentIntake} />
      </div>
    );
  };

  // ============================================
  // STEP 2: REVENUE BY LEVEL
  // ============================================
  const renderStep2 = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <StepHeader 
        step={2} 
        title="Revenue by Level" 
        description={`Enter your fee revenue at each stage of the disability process for ${DATA_YEARS.join(', ')}.`}
      />
      
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        marginBottom: '20px',
        fontSize: '11px',
        color: '#fbbf24',
      }}>
        Enter revenue in dollars. Leave fields blank if data is unavailable—the model will estimate where possible.
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '180px' }}>Revenue Level</th>
              {DATA_YEARS.map(year => (
                <th key={year} style={{ ...thStyle, textAlign: 'center' }}>{year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'application', label: 'Application Level' },
              { key: 'reconsideration', label: 'Reconsideration Level' },
              { key: 'hearing', label: 'Hearing Level' },
              { key: 'appealsCouncil', label: 'Appeals Council Level' },
              { key: 'eaja', label: 'EAJA (US District Court)' },
              { key: 'fee406a', label: '406A Fees' },
              { key: 'fee406b', label: '406B Fees' },
            ].map((row, i) => (
              <tr key={row.key} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{row.label}</td>
                {DATA_YEARS.map(year => (
                  <td key={year} style={{ padding: '6px' }}>
                    <input
                      type="text"
                      value={firmData.revenueByLevel[year]?.[row.key] || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFirmData({
                          ...firmData,
                          revenueByLevel: {
                            ...firmData.revenueByLevel,
                            [year]: {
                              ...firmData.revenueByLevel[year],
                              [row.key]: value,
                            }
                          }
                        });
                      }}
                      placeholder="$0"
                      style={{ ...inputStyle, width: '100%', textAlign: 'right', padding: '8px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
              <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: '600' }}>Total</td>
              {DATA_YEARS.map(year => (
                <td key={year} style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>
                  {formatCurrency(getTotalRevenue(firmData.revenueByLevel[year]))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      
      <DataCompletenessIndicator completeness={dataCompleteness} type="revenue" />
      
      <NavigationButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
    </div>
  );

  // ============================================
  // STEP 3: CASE EVENTS
  // ============================================
  const renderStep3 = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <StepHeader 
        step={3} 
        title="Case Events" 
        description={`Enter the number of key events at each stage for ${DATA_YEARS.join(', ')}.`}
      />
      
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '20px',
        fontSize: '11px',
        color: '#93c5fd',
      }}>
        This data helps calculate conversion rates and validate timing assumptions.
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '200px' }}>Event Type</th>
              {DATA_YEARS.map(year => (
                <th key={year} style={{ ...thStyle, textAlign: 'center' }}>{year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'signUps', label: 'Sign-Ups (New Clients)' },
              { key: 'applicationsFiled', label: 'Applications Filed' },
              { key: 'requestsForRecon', label: 'Requests for Reconsideration' },
              { key: 'requestsForHearing', label: 'Requests for Hearing' },
              { key: 'hearingsHeld', label: 'Hearings Held' },
              { key: 'acAppeals', label: 'Appeals Council Appeals' },
              { key: 'usdcComplaints', label: 'USDC Complaints Filed' },
              { key: 'usdcRemands', label: 'USDC Remands Received' },
              { key: 'casesWon', label: 'Total Cases Won (Generated a Fee)' },
            ].map((row, i) => (
              <tr key={row.key} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{row.label}</td>
                {DATA_YEARS.map(year => (
                  <td key={year} style={{ padding: '6px' }}>
                    <input
                      type="number"
                      value={firmData.eventsByYear[year]?.[row.key] || ''}
                      onChange={(e) => {
                        setFirmData({
                          ...firmData,
                          eventsByYear: {
                            ...firmData.eventsByYear,
                            [year]: {
                              ...firmData.eventsByYear[year],
                              [row.key]: e.target.value,
                            }
                          }
                        });
                      }}
                      placeholder="0"
                      style={{ ...inputStyle, width: '100%', textAlign: 'right', padding: '8px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <DataCompletenessIndicator completeness={dataCompleteness} type="events" />
      
      {/* Closed No Fee Percentage */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '10px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#a78bfa', fontWeight: '600', marginBottom: '8px' }}>
          Closed No Fee Percentage (Optional)
        </label>
        <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.5' }}>
          What percentage of your signed cases close without generating a fee? This includes cases that are 
          abandoned, denied at all levels, or otherwise don't result in payment. If you don't know this, 
          leave it blank and we'll estimate it from your funnel data above.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            step="0.1"
            value={firmData.closedNoFeePercent}
            onChange={(e) => setFirmData({ ...firmData, closedNoFeePercent: e.target.value })}
            placeholder="e.g., 30"
            style={{ ...inputStyle, width: '100px', textAlign: 'center' }}
          />
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>%</span>
        </div>
        {kpis.closed_no_fee_percent && kpis.closed_no_fee_percent !== '' && (
          <p style={{ fontSize: '11px', color: '#6366f1', marginTop: '8px' }}>
            Saved KPI: {kpis.closed_no_fee_percent}%
          </p>
        )}
      </div>
      
      <NavigationButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
    </div>
  );

  // ============================================
  // STEP 4: REVIEW & GENERATE
  // ============================================
  const renderStep4 = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <StepHeader 
        step={4} 
        title="Review & Generate Forecast" 
        description="Review your data and calculated metrics before generating the forecast."
      />
      
      {/* Data Quality Assessment */}
      <div style={{
        padding: '20px',
        backgroundColor: yearsWithData.length >= 2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderRadius: '10px',
        border: `1px solid ${yearsWithData.length >= 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '24px' }}>{yearsWithData.length >= 2 ? '✓' : '⚠️'}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: yearsWithData.length >= 2 ? '#10b981' : '#fbbf24' }}>
              {yearsWithData.length >= 2 ? 'Good Data Coverage' : 'Limited Data Available'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {yearsWithData.length} of {DATA_YEARS.length} years have sufficient data for analysis
            </div>
          </div>
        </div>
        {yearsWithData.length < 2 && (
          <p style={{ fontSize: '11px', color: '#fbbf24', margin: 0 }}>
            Forecasts will be less accurate with limited historical data. Consider adding more years 
            or using industry averages where your data is incomplete.
          </p>
        )}
      </div>
      
      {/* Calculated Metrics Preview */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>
          Calculated Metrics
        </h3>
        
        {/* Warning if missing data */}
        {calculatedMetrics.avgFeePerWinSource === 'none' && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#fca5a5',
          }}>
            <strong>Missing Data:</strong> Cannot calculate Average Fee Per Win. 
            Please go back and enter "Total Cases Won" in the Case Events section for at least one year.
          </div>
        )}
        
        {calculatedMetrics.closedNoFeeSource === 'none' && calculatedMetrics.avgFeePerWinSource !== 'none' && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#fbbf24',
          }}>
            <strong>Missing Data:</strong> Cannot determine Closed No Fee %. 
            Please go back and either enter your "Closed No Fee Percentage" or provide more complete funnel data 
            (Sign-Ups, Applications Filed, USDC Complaints, USDC Remands).
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <MetricCard 
            label="Avg Fee Per Win" 
            value={calculatedMetrics.avgFeePerWin > 0 ? formatCurrency(calculatedMetrics.avgFeePerWin) : '—'}
            sub={calculatedMetrics.avgFeePerWin > 0 ? 'Total Revenue ÷ Cases Won' : 'Missing cases won data'}
            warning={calculatedMetrics.avgFeePerWinSource === 'none'}
          />
          <MetricCard 
            label="Closed No Fee %" 
            value={calculatedMetrics.closedNoFeePercent > 0 ? `${calculatedMetrics.closedNoFeePercent.toFixed(1)}%` : '—'}
            sub={calculatedMetrics.closedNoFeeSource === 'user_provided' ? 'You provided this' : 
                 calculatedMetrics.closedNoFeeSource === 'estimated_from_funnel' ? `Est. from funnel (min ${calculatedMetrics.estimatedClosedNoFee.toFixed(0)}%)` : 
                 'Missing data'}
            warning={calculatedMetrics.closedNoFeeSource === 'none'}
          />
          <MetricCard 
            label="Avg Fee Per Sign-Up" 
            value={calculatedMetrics.avgFeePerSignUp > 0 ? formatCurrency(calculatedMetrics.avgFeePerSignUp) : '—'}
            sub={calculatedMetrics.avgFeePerSignUp > 0 ? 'Fee Per Win × (1 - No Fee %)' : 'Cannot calculate'}
            highlight={calculatedMetrics.avgFeePerSignUp > 0}
          />
          <MetricCard 
            label="Steady State Revenue" 
            value={calculatedMetrics.steadyState.annualRevenue > 0 ? formatCurrency(calculatedMetrics.steadyState.annualRevenue) : '—'}
            sub={calculatedMetrics.steadyState.annualRevenue > 0 ? `at ${calculatedMetrics.steadyState.monthlyIntake}/mo intake` : 'Cannot calculate'}
            highlight={calculatedMetrics.steadyState.annualRevenue > 0}
          />
        </div>
      </div>
      
      {/* Conversion Rates */}
      {Object.keys(calculatedMetrics.conversionRates).length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>
            Calculated Conversion Rates
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '8px',
            fontSize: '11px',
          }}>
            {[
              { key: 'applicationToRecon', label: 'App → Recon' },
              { key: 'reconToHearing', label: 'Recon → Hearing' },
              { key: 'hearingToAC', label: 'Hearing → AC' },
              { key: 'acToUSC', label: 'AC → USDC' },
              { key: 'usdcRemandRate', label: 'USDC Remand Rate' },
            ].map(({ key, label }) => (
              <div key={key} style={{
                padding: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '6px',
                textAlign: 'center',
              }}>
                <div style={{ color: '#64748b', marginBottom: '4px' }}>{label}</div>
                <div style={{ color: '#e2e8f0', fontWeight: '600' }}>
                  {calculatedMetrics.conversionRates[key]?.toFixed(0) || '—'}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Revenue Distribution */}
      {Object.values(calculatedMetrics.revenuePerLevel).some(v => v > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>
            Revenue Distribution by Stage
          </h3>
          <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
            {[
              { key: 'application', color: '#8b5cf6', label: 'App' },
              { key: 'reconsideration', color: '#f59e0b', label: 'Recon' },
              { key: 'hearing', color: '#3b82f6', label: 'Hearing' },
              { key: 'appealsCouncil', color: '#ec4899', label: 'AC' },
              { key: 'federal', color: '#10b981', label: 'Federal' },
            ].map(({ key, color, label }) => {
              const pct = calculatedMetrics.revenuePerLevel[key] || 0;
              if (pct < 1) return null;
              return (
                <div 
                  key={key}
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    color: 'white',
                    fontWeight: '600',
                  }}
                  title={`${label}: ${pct.toFixed(1)}%`}
                >
                  {pct >= 10 ? `${Math.round(pct)}%` : ''}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px' }}>
            {[
              { key: 'application', color: '#8b5cf6', label: 'Application' },
              { key: 'reconsideration', color: '#f59e0b', label: 'Reconsideration' },
              { key: 'hearing', color: '#3b82f6', label: 'Hearing' },
              { key: 'appealsCouncil', color: '#ec4899', label: 'AC' },
              { key: 'federal', color: '#10b981', label: 'Federal' },
            ].map(({ key, color, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
                <span style={{ color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <NavigationButtons 
        onBack={() => setStep(3)} 
        onNext={() => setStep(5)} 
        nextLabel="Generate Forecast →"
        nextHighlight
        canProceed={calculatedMetrics.avgFeePerSignUp > 0}
      />
    </div>
  );

  // ============================================
  // STEP 5: RESULTS DASHBOARD
  // ============================================
  // Memoize chart data to prevent unnecessary Recharts re-renders
  const intakeData = useMemo(() => DATA_YEARS.map(year => ({
    year: String(year),
    intake: parseInt(firmData.eventsByYear[year]?.signUps) || 0,
  })).filter(d => d.intake > 0), [firmData.eventsByYear]);

  // Memoize projection year lookup for chart dot rendering
  const projectionYearMap = useMemo(() => {
    const map = new Map();
    projections.forEach(p => map.set(p.year, p));
    return map;
  }, [projections]);

  const renderStep5 = () => {
    return (
      <div ref={contentRef}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BenefitArcLogoSmall size={36} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  {firmData.firmName || 'Revenue Forecast'}
                </h1>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                  Steady State Projection
                </span>
              </div>
              <p style={{ color: '#64748b', margin: 0, fontSize: '11px' }}>
                BenefitArc • Generated {TODAY.toLocaleDateString()} • {yearsWithData.length} years of data
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ExportToolbar
              contentRef={contentRef}
              pdfFilename="BenefitArc-Steady-State-Projection"
              excelData={forecastExcelData}
              excelSheetName="Forecast"
              excelFilename="BenefitArc-Steady-State-Forecast"
            />
            <button
              onClick={() => {
                if (confirm('Clear all data and start over?')) {
                  setFirmData({
                    firmName: '',
                    revenueByLevel: DATA_YEARS.reduce((acc, year) => ({
                      ...acc, [year]: { application: '', reconsideration: '', hearing: '', appealsCouncil: '', eaja: '', fee406a: '', fee406b: '' }
                    }), {}),
                    eventsByYear: DATA_YEARS.reduce((acc, year) => ({
                      ...acc, [year]: { signUps: '', applicationsFiled: '', requestsForRecon: '', requestsForHearing: '', hearingsHeld: '', acAppeals: '', usdcComplaints: '', usdcRemands: '', casesWon: '' }
                    }), {}),
                    closedNoFeePercent: '',
                    recentMonthlyIntake: {
                      month1: '',
                      month2: '',
                      month3: '',
                    },
                  });
                  setStep(0);
                  setDataConfirmed(false);
                }
              }}
              style={{
                padding: '8px 12px', borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444', fontSize: '11px', cursor: 'pointer',
              }}
            >
              🗑️ Clear Data
            </button>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '8px 16px', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent',
                color: '#94a3b8', fontSize: '11px', cursor: 'pointer',
              }}
            >
              Edit Inputs
            </button>
            <StatBox label="Projected Intake" value={`${calculatedMetrics.steadyState.monthlyIntake}/mo`} color="#3b82f6" />
            <StatBox 
              label="Steady State" 
              value={formatCurrency(calculatedMetrics.steadyState.annualRevenue)} 
              sub="/year" 
              color="#10b981" 
              highlight 
            />
          </div>
        </div>

        {/* Data Quality Banner */}
        {yearsWithData.length < 2 && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            marginBottom: '16px',
            fontSize: '11px',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ⚠️ Limited historical data. Forecasts are estimates based on industry averages where your data was incomplete.
          </div>
        )}

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
          <Metric 
            label="Avg Fee/Win" 
            value={calculatedMetrics.avgFeePerWin > 0 ? formatCurrency(calculatedMetrics.avgFeePerWin) : '—'} 
            sub="Revenue ÷ Cases Won" 
            color="#8b5cf6" 
          />
          <Metric 
            label="Closed No Fee" 
            value={calculatedMetrics.closedNoFeePercent > 0 ? `${calculatedMetrics.closedNoFeePercent.toFixed(0)}%` : '—'} 
            sub={calculatedMetrics.closedNoFeeSource === 'user_provided' ? 'You provided' : 'Estimated'} 
            color="#f59e0b" 
          />
          <Metric 
            label="Avg Fee/Sign-Up" 
            value={calculatedMetrics.avgFeePerSignUp > 0 ? formatCurrency(calculatedMetrics.avgFeePerSignUp) : '—'} 
            sub="Includes no-fee cases" 
            color="#10b981" 
          />
          <Metric 
            label={`${CURRENT_YEAR + 1} Forecast`} 
            value={formatCurrency(projections.find(p => p.year === String(CURRENT_YEAR + 1))?.revenue || 0)} 
            sub={`${projections.find(p => p.year === String(CURRENT_YEAR + 1))?.pctSteady || 0}% of steady`} 
            color="#3b82f6" 
          />
          <Metric 
            label="EAJA/Remand" 
            value={calculatedMetrics.eajaPerRemand > 0 ? formatCurrency(calculatedMetrics.eajaPerRemand) : '—'} 
            sub={calculatedMetrics.eajaRate > 0 ? `${calculatedMetrics.eajaRate.toFixed(1)}% of cases` : ''} 
            color="#06b6d4" 
          />
          <Metric 
            label="EAJA Steady State" 
            value={calculatedMetrics.steadyState.annualEaja > 0 ? formatCurrency(calculatedMetrics.steadyState.annualEaja) : '—'} 
            sub={calculatedMetrics.steadyState.eajaRemands > 0 ? `${calculatedMetrics.steadyState.eajaRemands} remands/yr` : ''} 
            color="#ec4899" 
          />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', marginBottom: '14px' }}>
          {/* Revenue Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)',
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revenue Trajectory
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={projections} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" vertical={false} />
                <XAxis dataKey="year" stroke="#6366f1" fontSize={10} tickLine={false} />
                <YAxis stroke="#6366f1" fontSize={9} tickFormatter={formatCurrency} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v) => [formatFull(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="transparent" fill="url(#projGradient)" />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  dot={(props) => {
                    const proj = projectionYearMap.get(props.payload?.year);
                    return (
                      <circle cx={props.cx} cy={props.cy} r={proj?.isActual ? 5 : 3}
                        fill={proj?.isActual ? '#10b981' : '#6366f1'}
                        stroke={proj?.isActual ? '#10b981' : '#6366f1'} strokeWidth={2} />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
              <LegendItem color="#10b981" label="Actual" />
              <LegendItem color="#6366f1" label="Projected" />
            </div>
          </div>

          {/* Intake Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)',
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Historical Intake
            </h2>
            {intakeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={intakeData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" vertical={false} />
                  <XAxis dataKey="year" stroke="#6366f1" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6366f1" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="intake" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: '180px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6366f1',
                fontSize: '12px',
              }}>
                No historical intake data provided
              </div>
            )}
          </div>
        </div>

        {/* Forecast Table */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '14px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Annual Forecast
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#6366f1', fontWeight: '500' }}>Year</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#6366f1', fontWeight: '500' }}>Intake</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#6366f1', fontWeight: '500' }}>Wtd Source</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#f1f5f9', fontWeight: '600' }}>Revenue</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#6366f1', fontWeight: '500' }}>% Steady</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((row) => (
                <tr key={row.year} style={{ 
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  backgroundColor: row.isActual ? 'rgba(16, 185, 129, 0.1)' : 
                                   row.pctSteady >= 95 ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>
                    {row.year}
                    {row.isActual && <span style={{ marginLeft: '6px', fontSize: '9px', color: '#10b981' }}>ACTUAL</span>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                    {row.intake > 0 ? row.intake.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                    {row.weightedIntake > 0 ? row.weightedIntake.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#f1f5f9', fontWeight: '600' }}>
                    {row.revenue > 0 ? formatFull(row.revenue) : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {row.pctSteady > 0 ? <ProgressPill value={row.pctSteady} /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Model Assumptions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div style={{ 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
            borderRadius: '12px', 
            border: '1px solid rgba(99, 102, 241, 0.3)',
            fontSize: '11px',
          }}>
            <strong style={{ color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>How Metrics Were Calculated</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: '16px', color: '#94a3b8', lineHeight: '1.8' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Avg Fee Per Win:</strong> Total Revenue ÷ Total Cases Won</li>
              <li><strong style={{ color: '#e2e8f0' }}>Closed No Fee %:</strong> {
                calculatedMetrics.closedNoFeeSource === 'user_provided' ? 'You provided this value' :
                calculatedMetrics.closedNoFeeSource === 'estimated_from_funnel' ? 'Estimated from funnel drop-offs' :
                'Not calculated'
              }</li>
              <li><strong style={{ color: '#e2e8f0' }}>Avg Fee Per Sign-Up:</strong> Avg Fee Per Win × (1 - Closed No Fee %)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Steady State:</strong> Monthly Intake × 12 × Avg Fee Per Sign-Up</li>
            </ul>
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderRadius: '12px', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '11px',
          }}>
            <strong style={{ color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>Data Used</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: '16px', color: '#94a3b8', lineHeight: '1.8' }}>
              <li>Years analyzed: {yearsWithData.length > 0 ? yearsWithData.join(', ') : 'None'}</li>
              <li>Current intake: {calculatedMetrics.steadyState.monthlyIntake} cases/month (3-month avg)</li>
              <li>Projected annual intake: {calculatedMetrics.steadyState.annualIntake.toLocaleString()} cases</li>
              <li>EAJA per remand: {calculatedMetrics.eajaPerRemand > 0 ? formatCurrency(calculatedMetrics.eajaPerRemand) : 'Not calculated'}</li>
              <li>EAJA rate: {calculatedMetrics.eajaRate > 0 ? `${calculatedMetrics.eajaRate.toFixed(1)}%` : 'Not calculated'}</li>
            </ul>
          </div>
        </div>
        
        {/* Caveat */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '10px',
          color: '#94a3b8',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: '#6366f1' }}>Important:</strong> These projections assume monthly intake remains stable at {calculatedMetrics.steadyState.monthlyIntake} cases/month. 
          Significant changes in intake volume—whether growth or decline—will affect future revenue. 
          Win rates, fee amounts, and SSA processing times may also vary. We recommend updating this model quarterly 
          with current intake data and comparing actual results against projections.
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Futuristic background grid */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />
      
      {/* Gradient orbs for futuristic effect */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Progress indicator (steps 1-4) */}
        {step >= 1 && step <= 4 && (
          <div style={{ maxWidth: '700px', margin: '0 auto 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {[1, 2, 3, 4].map(s => (
                <React.Fragment key={s}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: s <= step 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' 
                      : 'rgba(99, 102, 241, 0.1)',
                    border: s <= step ? 'none' : '1px solid rgba(99, 102, 241, 0.3)',
                    color: s <= step ? 'white' : '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '600',
                    boxShadow: s <= step ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
                  }}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 4 && (
                    <div style={{
                      flex: 1, height: '2px',
                      background: s < step 
                        ? 'linear-gradient(90deg, #3b82f6, #6366f1)' 
                        : 'rgba(99, 102, 241, 0.2)',
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6366f1', padding: '0 4px' }}>
              <span>Firm Info</span>
              <span>Revenue</span>
              <span>Events</span>
              <span>Review</span>
            </div>
          </div>
        )}
        
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTotalRevenue(revenueObj) {
  if (!revenueObj) return 0;
  return Object.values(revenueObj).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
}

// ============================================
// STYLES
// ============================================

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(99, 102, 241, 0.3)',
  backgroundColor: 'rgba(15, 15, 25, 0.8)',
  color: '#e2e8f0',
  fontSize: '13px',
  width: '100%',
  transition: 'all 0.2s ease',
  outline: 'none',
};

const thStyle = {
  padding: '10px 12px',
  color: '#6366f1',
  fontWeight: '500',
  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
  fontSize: '11px',
};

// ============================================
// HELPER COMPONENTS
// ============================================

function StepHeader({ step, title, description }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>
        STEP {step}
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
        {description}
      </p>
    </div>
  );
}

function NavigationButtons({ onBack, onNext, canProceed = true, nextLabel = 'Next →', nextHighlight = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
      <button
        onClick={onBack}
        style={{
          padding: '10px 24px', borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.3)', 
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#6366f1', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed}
        style={{
          padding: '10px 24px', borderRadius: '10px', border: 'none',
          background: canProceed 
            ? (nextHighlight 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)')
            : 'rgba(99, 102, 241, 0.2)',
          color: 'white', fontSize: '13px', fontWeight: '600',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          boxShadow: canProceed ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function DataCompletenessIndicator({ completeness, type }) {
  const years = Object.keys(completeness);
  return (
    <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px' }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Data Completeness</div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {years.map(year => {
          const data = completeness[year];
          const count = type === 'revenue' ? data.revenue : data.events;
          const max = type === 'revenue' ? 7 : 9;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={year} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>{year}</div>
              <div style={{ 
                height: '4px', 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{ 
                  width: `${pct}%`, 
                  height: '100%', 
                  backgroundColor: pct >= 50 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#64748b',
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{count}/{max}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, warning }) {
  return (
    <div style={{
      padding: '14px',
      background: warning 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'
        : highlight 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)' 
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
      borderRadius: '12px',
      border: `1px solid ${warning ? 'rgba(239, 68, 68, 0.3)' : highlight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ fontSize: '11px', color: warning ? '#fca5a5' : '#6366f1', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '700', color: warning ? '#fca5a5' : highlight ? '#10b981' : '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: warning ? '#f87171' : '#64748b' }}>{sub}</div>}
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.8) 0%, rgba(15, 15, 25, 0.6) 100%)',
      borderRadius: '12px',
      padding: '12px',
      borderTop: `2px solid ${color}`,
      border: '1px solid rgba(99, 102, 241, 0.15)',
      boxShadow: `0 0 20px ${color}15`,
    }}>
      <div style={{ fontSize: '9px', color: '#6366f1', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#64748b' }}>{sub}</div>
    </div>
  );
}

function StatBox({ label, value, sub, color, highlight }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: highlight 
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
      borderRadius: '12px',
      border: `1px solid ${highlight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
      textAlign: 'right',
      boxShadow: highlight ? '0 0 25px rgba(16, 185, 129, 0.2)' : '0 0 15px rgba(99, 102, 241, 0.1)',
    }}>
      <div style={{ fontSize: '9px', color: color, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: highlight ? '#10b981' : '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: '9px', color: '#64748b' }}>{sub}</div>}
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
      <div style={{ width: '12px', height: '3px', backgroundColor: color, borderRadius: '2px' }} />
      <span style={{ color: '#94a3b8' }}>{label}</span>
    </div>
  );
}

function ProgressPill({ value }) {
  const color = value >= 95 ? '#10b981' : value >= 75 ? '#6366f1' : value >= 50 ? '#3b82f6' : '#64748b';
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '600',
      background: `linear-gradient(135deg, ${color}30, ${color}10)`,
      border: `1px solid ${color}50`,
      color: color,
    }}>
      {value}%
    </span>
  );
}

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="arcGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#arcGradient)" strokeWidth="2" opacity="0.5"/>
      
      {/* Rising arc - represents growth trajectory */}
      <path 
        d="M 20 70 Q 35 65 50 45 Q 65 25 80 20" 
        stroke="url(#arcGradient)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      
      {/* Secondary arc - represents case flow */}
      <path 
        d="M 25 75 Q 40 70 55 55 Q 70 40 82 35" 
        stroke="url(#arcGradient2)" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      
      {/* Data points on the arc */}
      <circle cx="20" cy="70" r="4" fill="#3b82f6" filter="url(#glow)"/>
      <circle cx="50" cy="45" r="5" fill="#6366f1" filter="url(#glow)"/>
      <circle cx="80" cy="20" r="6" fill="#10b981" filter="url(#glow)"/>
      
      {/* Small accent dots */}
      <circle cx="35" cy="58" r="2" fill="#3b82f6" opacity="0.7"/>
      <circle cx="65" cy="32" r="2.5" fill="#10b981" opacity="0.7"/>
    </svg>
  );
}

function BenefitArcLogoSmall({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arcGradientSmall" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path 
        d="M 15 75 Q 35 65 50 42 Q 65 20 85 12" 
        stroke="url(#arcGradientSmall)" 
        strokeWidth="8" 
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="15" cy="75" r="6" fill="#3b82f6"/>
      <circle cx="50" cy="42" r="7" fill="#6366f1"/>
      <circle cx="85" cy="12" r="8" fill="#10b981"/>
    </svg>
  );
}
