'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, FunnelChart, Funnel, LabelList } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

// ============================================
// BENEFITARC CASE PIPELINE ANALYZER
// ============================================

// Stage configuration with publicly available data
// Wait times: SSA FY2024 data, AARP Oct 2025, Atticus June 2024
// Win rates: SSA 2024 data, multiple verified sources
const STAGES = [
  { 
    key: 'application', 
    label: 'Application', 
    shortLabel: 'App', 
    color: '#3b82f6', 
    avgMonthsToDecision: 8,  // 230 days avg per AARP Oct 2025
    cumulativeMonths: 8,     // From sign-up to decision
  },
  { 
    key: 'reconsideration', 
    label: 'Reconsideration', 
    shortLabel: 'Recon', 
    color: '#6366f1', 
    avgMonthsToDecision: 7,  // 7.1 months per Atticus June 2024
    cumulativeMonths: 15,    // 8 + 7 = 15 months from sign-up
  },
  { 
    key: 'hearing', 
    label: 'ALJ Hearing', 
    shortLabel: 'Hearing', 
    color: '#8b5cf6', 
    avgMonthsToDecision: 11, // 8.8 months to hearing + 2 months for decision
    cumulativeMonths: 26,    // 15 + 11 = 26 months from sign-up
  },
  { 
    key: 'appeals_council', 
    label: 'Appeals Council', 
    shortLabel: 'AC', 
    color: '#a855f7', 
    avgMonthsToDecision: 9,  // 6-12 months, using 9 as midpoint
    cumulativeMonths: 35,    // 26 + 9 = 35 months from sign-up
  },
  { 
    key: 'federal_court', 
    label: 'Federal Court', 
    shortLabel: 'USDC', 
    color: '#d946ef', 
    avgMonthsToDecision: 15, // 12-18 months, using 15 as midpoint
    cumulativeMonths: 50,    // 35 + 15 = 50 months from sign-up
  },
];

// Default win rates by stage - SSA 2024 data
// Sources: SSA workload data, Atticus, DisabilityHelpGroup, O'Neil & Bowman
const DEFAULT_WIN_RATES = {
  application: 0.36,      // 35-37% per SSA 2024 data
  reconsideration: 0.14,  // 13-16% per SSA 2024 data
  hearing: 0.54,          // 51-58% per SSA 2024 data (using 54% midpoint)
  appeals_council: 0.13,  // ~1% direct + 12% remand that often results in approval
  federal_court: 0.64,    // ~1% direct + 63% remand per federal court data
};

// Data source citations for transparency
const DATA_SOURCES = {
  waitTimes: "SSA FY2024 Performance Data, AARP (Oct 2025), Atticus (June 2024)",
  winRates: "SSA 2024 Workload Data, DisabilityHelpGroup, O'Neil & Bowman Disability",
};

// Default average fees by stage (based on industry data)
// Users can accept these defaults or input their own
const DEFAULT_FEES = {
  application: 3500,
  reconsideration: 3000,
  hearing: 6500,
  appeals_council: 5000,
  federal_court: 7000,  // This is now primarily EAJA - 406A/B calculated separately
};

// Federal Court / USDC specific constants
const USDC_CONSTANTS = {
  remandRate: 0.50,         // 50% of USDC cases get remanded
  avgEAJAFee: 6500,         // Average EAJA fee per remand
  remandWinRate: 0.50,      // 50% of remanded cases win on remand
  avg406ABFee: 10000,       // Average 406A/B fee for remand wins
  targetHearingDenialToUSDCRate: 0.50,  // Target: 50% of hearing denials should reach USDC
  referralFeePercent: 0.25, // 25% referral fee if case is referred out
};

const formatCurrency = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value) => {
  return new Intl.NumberFormat().format(value);
};

// ============================================
// LOGO COMPONENT
// ============================================

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pipelineArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="pipelineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#pipelineArcGradient)" strokeWidth="2" opacity="0.5"/>
      <path 
        d="M 20 70 Q 35 65 50 45 Q 65 25 80 20" 
        stroke="url(#pipelineArcGradient)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
        filter="url(#pipelineGlow)"
      />
      <circle cx="20" cy="70" r="4" fill="#3b82f6" filter="url(#pipelineGlow)"/>
      <circle cx="50" cy="45" r="5" fill="#6366f1" filter="url(#pipelineGlow)"/>
      <circle cx="80" cy="20" r="6" fill="#10b981" filter="url(#pipelineGlow)"/>
    </svg>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CasePipelineAnalyzer() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [feeInputMethod, setFeeInputMethod] = useState(null); // 'direct' or 'calculate'
  const [feesLoading, setFeesLoading] = useState(true);
  const [feesSaving, setFeesSaving] = useState(false);
  const [feeSaveError, setFeeSaveError] = useState('');
  
  // Fee data - initialized with defaults, user can override
  const [fees, setFees] = useState({
    application: DEFAULT_FEES.application.toString(),
    reconsideration: DEFAULT_FEES.reconsideration.toString(),
    hearing: DEFAULT_FEES.hearing.toString(),
    appeals_council: DEFAULT_FEES.appeals_council.toString(),
    federal_court: DEFAULT_FEES.federal_court.toString(),
  });
  
  // Track if user has customized fees (vs using defaults)
  const [usingDefaultFees, setUsingDefaultFees] = useState(true);
  
  // For "help me calculate" method
  const [calcData, setCalcData] = useState({
    application: { cases: '', revenue: '' },
    reconsideration: { cases: '', revenue: '' },
    hearing: { cases: '', revenue: '' },
    appeals_council: { cases: '', revenue: '' },
    federal_court: { cases: '', revenue: '' },
  });
  
  // Pipeline data (case counts at each stage)
  const [pipeline, setPipeline] = useState({
    application: '',
    reconsideration: '',
    hearing: '',
    appeals_council: '',
    federal_court: '',
  });

  // Win rates (editable)
  const [winRates, setWinRates] = useState(DEFAULT_WIN_RATES);

  // Appeal rates (% of denied cases that appeal to next level)
  const [appealRates, setAppealRates] = useState({
    applicationToRecon: 85,      // % denied at App who appeal to Recon
    reconToHearing: 90,          // % denied at Recon who appeal to Hearing
    hearingToAC: 35,             // % denied at Hearing who appeal to AC
    acToFederalCourt: 0,         // % denied at AC who go to Federal Court (default 0)
  });
  
  // Overall attrition rate (lost contact, death, return to work, etc.)
  const [attritionRate, setAttritionRate] = useState(10);

  // ============================================
  // LOAD SAVED FEE DATA
  // ============================================
  
  useEffect(() => {
    const loadFeeData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_fee_data')
          .select('application_fee, reconsideration_fee, hearing_fee, appeals_council_fee, federal_court_fee')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setFees({
            application: data.application_fee?.toString() || '',
            reconsideration: data.reconsideration_fee?.toString() || '',
            hearing: data.hearing_fee?.toString() || '',
            appeals_council: data.appeals_council_fee?.toString() || '',
            federal_court: data.federal_court_fee?.toString() || '',
          });
        }
      } catch (err) {
        // No saved data yet - that's fine
        // No saved data yet - use defaults
      } finally {
        setFeesLoading(false);
      }
    };
    
    loadFeeData();
  }, [user]);

  // ============================================
  // SAVE FEE DATA
  // ============================================
  
  const saveFeeData = async () => {
    if (!user) return;
    
    setFeesSaving(true);
    setFeeSaveError('');

    try {
      const feeData = {
        user_id: user.id,
        application_fee: parseFloat(fees.application) || null,
        reconsideration_fee: parseFloat(fees.reconsideration) || null,
        hearing_fee: parseFloat(fees.hearing) || null,
        appeals_council_fee: parseFloat(fees.appeals_council) || null,
        federal_court_fee: parseFloat(fees.federal_court) || null,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('user_fee_data')
        .upsert(feeData, { onConflict: 'user_id' });
      
      if (error) throw error;
      
    } catch (err) {
      setFeeSaveError('Error saving fee data. Please try again.');
    } finally {
      setFeesSaving(false);
    }
  };

  // ============================================
  // CALCULATE FEES FROM REVENUE/CASES
  // ============================================
  
  const calculateFeesFromData = () => {
    const newFees = {};
    STAGES.forEach(stage => {
      const cases = parseFloat(calcData[stage.key].cases) || 0;
      const revenue = parseFloat(calcData[stage.key].revenue) || 0;
      if (cases > 0 && revenue > 0) {
        newFees[stage.key] = (revenue / cases).toFixed(0);
      } else {
        newFees[stage.key] = fees[stage.key] || '';
      }
    });
    setFees(newFees);
  };

  // ============================================
  // PIPELINE ANALYSIS CALCULATIONS
  // ============================================
  
  const analysis = useMemo(() => {
    const attritionMultiplier = 1 - (attritionRate / 100);
    
    // Calculate expected value for cases at each stage
    // This accounts for: wins at current stage + value of appeals to next stages
    const calculateStageValue = (stageKey, caseCount, avgFee) => {
      if (caseCount === 0) return { directWins: 0, appealValue: 0, totalValue: 0, eajaValue: 0, fee406ABValue: 0 };
      
      const winRate = winRates[stageKey] || 0;
      const adjustedCases = caseCount * attritionMultiplier;
      const directWins = adjustedCases * winRate;
      const directValue = directWins * avgFee;
      
      // Calculate appeal value (denied cases that continue)
      const deniedCases = adjustedCases * (1 - winRate);
      let appealValue = 0;
      let eajaValue = 0;
      let fee406ABValue = 0;
      
      if (stageKey === 'application') {
        const appealRate = appealRates.applicationToRecon / 100;
        const casesToRecon = deniedCases * appealRate;
        const reconFee = parseFloat(fees.reconsideration) || 0;
        const nextStage = calculateStageValue('reconsideration', casesToRecon, reconFee);
        appealValue = nextStage.totalValue;
        eajaValue = nextStage.eajaValue;
        fee406ABValue = nextStage.fee406ABValue;
      } else if (stageKey === 'reconsideration') {
        const appealRate = appealRates.reconToHearing / 100;
        const casesToHearing = deniedCases * appealRate;
        const hearingFee = parseFloat(fees.hearing) || 0;
        const nextStage = calculateStageValue('hearing', casesToHearing, hearingFee);
        appealValue = nextStage.totalValue;
        eajaValue = nextStage.eajaValue;
        fee406ABValue = nextStage.fee406ABValue;
      } else if (stageKey === 'hearing') {
        const appealRate = appealRates.hearingToAC / 100;
        const casesToAC = deniedCases * appealRate;
        const acFee = parseFloat(fees.appeals_council) || 0;
        const nextStage = calculateStageValue('appeals_council', casesToAC, acFee);
        appealValue = nextStage.totalValue;
        eajaValue = nextStage.eajaValue;
        fee406ABValue = nextStage.fee406ABValue;
      } else if (stageKey === 'appeals_council') {
        const appealRate = appealRates.acToFederalCourt / 100;
        const casesToUSDC = deniedCases * appealRate;
        const nextStage = calculateStageValue('federal_court', casesToUSDC, 0); // USDC fee calculated differently
        appealValue = nextStage.totalValue;
        eajaValue = nextStage.eajaValue;
        fee406ABValue = nextStage.fee406ABValue;
      } else if (stageKey === 'federal_court') {
        // Federal Court has special EAJA + 406A/B calculation
        // Direct wins at USDC (rare, ~1%)
        const directUSDCWins = adjustedCases * winRate;
        const directUSDCValue = directUSDCWins * (parseFloat(fees.federal_court) || USDC_CONSTANTS.avg406ABFee);
        
        // Remands (50% of cases)
        const remandedCases = adjustedCases * USDC_CONSTANTS.remandRate;
        eajaValue = remandedCases * USDC_CONSTANTS.avgEAJAFee;
        
        // 50% of remands win on remand
        const remandWins = remandedCases * USDC_CONSTANTS.remandWinRate;
        fee406ABValue = remandWins * USDC_CONSTANTS.avg406ABFee;
        
        return {
          directWins: directUSDCWins,
          directValue: directUSDCValue,
          appealValue: 0,
          eajaValue,
          fee406ABValue,
          totalValue: directUSDCValue + eajaValue + fee406ABValue,
        };
      }
      
      return {
        directWins,
        directValue,
        appealValue,
        eajaValue,
        fee406ABValue,
        totalValue: directValue + appealValue,
      };
    };
    
    const stageData = STAGES.map(stage => {
      const caseCount = parseInt(pipeline[stage.key]) || 0;
      const avgFee = parseFloat(fees[stage.key]) || 0;
      const winRate = winRates[stage.key] || 0;
      
      // Simple calculation for display (direct wins only at this stage)
      const adjustedCases = caseCount * attritionMultiplier;
      const expectedWins = adjustedCases * winRate;
      const expectedRevenue = expectedWins * avgFee;
      
      // Full value calculation including appeal potential
      const fullValue = calculateStageValue(stage.key, caseCount, avgFee);
      
      const monthsToResolution = stage.cumulativeMonths;
      
      return {
        ...stage,
        caseCount,
        avgFee,
        winRate,
        expectedWins,
        expectedRevenue,          // Direct revenue at this stage
        totalPipelineValue: fullValue.totalValue,  // Including appeal value
        eajaValue: fullValue.eajaValue,
        fee406ABValue: fullValue.fee406ABValue,
        monthsToResolution,
      };
    });
    
    const totalCases = stageData.reduce((sum, s) => sum + s.caseCount, 0);
    const totalExpectedWins = stageData.reduce((sum, s) => sum + s.expectedWins, 0);
    const totalDirectRevenue = stageData.reduce((sum, s) => sum + s.expectedRevenue, 0);
    const totalPipelineValue = stageData.reduce((sum, s) => sum + s.totalPipelineValue, 0);
    const totalEAJAValue = stageData.reduce((sum, s) => sum + s.eajaValue, 0);
    const totalFee406ABValue = stageData.reduce((sum, s) => sum + s.fee406ABValue, 0);
    
    // ============================================
    // USDC OPPORTUNITY ANALYSIS
    // ============================================
    // Calculate what % of hearing denials currently reach USDC
    const hearingCases = parseInt(pipeline.hearing) || 0;
    const hearingDenialRate = 1 - (winRates.hearing || 0);
    const hearingDenials = hearingCases * attritionMultiplier * hearingDenialRate;
    
    // Current path to USDC: Hearing denial → AC → USDC
    const currentACAppealRate = appealRates.hearingToAC / 100;
    const currentUSDCAppealRate = appealRates.acToFederalCourt / 100;
    const currentHearingDenialToUSDCRate = currentACAppealRate * (1 - (winRates.appeals_council || 0)) * currentUSDCAppealRate;
    
    // Calculate opportunity if 50% of hearing denials reached USDC
    const targetUSDCRate = USDC_CONSTANTS.targetHearingDenialToUSDCRate;
    const currentCasesToUSDC = hearingDenials * currentHearingDenialToUSDCRate;
    const targetCasesToUSDC = hearingDenials * targetUSDCRate;
    const additionalCasesToUSDC = Math.max(0, targetCasesToUSDC - currentCasesToUSDC);
    
    // Calculate additional revenue from opportunity
    const additionalRemands = additionalCasesToUSDC * USDC_CONSTANTS.remandRate;
    const additionalEAJA = additionalRemands * USDC_CONSTANTS.avgEAJAFee;
    const additionalRemandWins = additionalRemands * USDC_CONSTANTS.remandWinRate;
    const additional406AB = additionalRemandWins * USDC_CONSTANTS.avg406ABFee;
    const additionalDirectWins = additionalCasesToUSDC * (winRates.federal_court || 0);
    const additionalDirectValue = additionalDirectWins * USDC_CONSTANTS.avg406ABFee;
    const totalAdditionalRevenue = additionalEAJA + additional406AB + additionalDirectValue;
    
    // Referral scenario: 25% of fees
    const referralFeePercent = USDC_CONSTANTS.referralFeePercent;
    const referralEAJA = additionalEAJA * referralFeePercent;
    const referral406AB = additional406AB * referralFeePercent;
    const referralDirectValue = additionalDirectValue * referralFeePercent;
    const totalReferralRevenue = referralEAJA + referral406AB + referralDirectValue;
    
    const usdcOpportunity = {
      isOpportunity: currentHearingDenialToUSDCRate < targetUSDCRate && hearingDenials > 0,
      currentRate: currentHearingDenialToUSDCRate,
      targetRate: targetUSDCRate,
      currentCasesToUSDC,
      targetCasesToUSDC,
      additionalCasesToUSDC,
      // In-house scenario
      additionalEAJA,
      additional406AB,
      additionalDirectValue,
      totalAdditionalRevenue,
      // Referral scenario
      referralFeePercent,
      referralEAJA,
      referral406AB,
      referralDirectValue,
      totalReferralRevenue,
      hearingDenials,
    };
    
    // Calculate revenue projections for 1, 3, and 5 years
    const calculateDetailedProjection = () => {
      const projections = {
        year1: 0,
        year3: 0,
        year5: 0,
      };
      
      stageData.forEach(stage => {
        if (stage.caseCount === 0) return;
        
        const avgRemainingMonths = stage.avgMonthsToDecision * 0.5;
        const stageValue = stage.totalPipelineValue;
        
        if (avgRemainingMonths <= 12) {
          projections.year1 += stageValue * 0.85;
          projections.year3 += stageValue;
          projections.year5 += stageValue;
        } else if (avgRemainingMonths <= 24) {
          const year1Pct = Math.max(0, (12 - avgRemainingMonths * 0.3) / 12) * 0.5;
          projections.year1 += stageValue * year1Pct;
          projections.year3 += stageValue * 0.95;
          projections.year5 += stageValue;
        } else if (avgRemainingMonths <= 36) {
          projections.year1 += stageValue * 0.15;
          projections.year3 += stageValue * 0.85;
          projections.year5 += stageValue;
        } else {
          projections.year1 += stageValue * 0.05;
          projections.year3 += stageValue * 0.60;
          projections.year5 += stageValue * 0.95;
        }
      });
      
      return projections;
    };
    
    const timeProjections = calculateDetailedProjection();
    
    // Weighted average time to revenue
    const weightedMonths = stageData.reduce((sum, s) => {
      return sum + (s.totalPipelineValue * s.avgMonthsToDecision * 0.5);
    }, 0);
    const avgMonthsToRevenue = totalPipelineValue > 0 ? weightedMonths / totalPipelineValue : 0;
    
    return {
      stageData,
      totalCases,
      totalExpectedWins,
      totalDirectRevenue,
      totalPipelineValue,
      totalEAJAValue,
      totalFee406ABValue,
      avgMonthsToRevenue,
      timeProjections,
      dataSources: DATA_SOURCES,
      attritionRate,
      appealRates,
      usdcOpportunity,
    };
  }, [pipeline, fees, winRates, appealRates, attritionRate]);

  // ============================================
  // CHECK IF FEES ARE COMPLETE
  // ============================================
  
  const hasCompleteFees = useMemo(() => {
    return STAGES.every(stage => {
      const fee = parseFloat(fees[stage.key]);
      return fee && fee > 0;
    });
  }, [fees]);

  const hasPipelineData = useMemo(() => {
    return STAGES.some(stage => {
      const count = parseInt(pipeline[stage.key]);
      return count && count > 0;
    });
  }, [pipeline]);

  // ============================================
  // STEP 0: WELCOME
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
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(217, 70, 239, 0.2) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
        }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '15px', 
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}>
            Case Pipeline Analyzer
          </span>
        </div>
      </div>
      
      <div style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#a855f7', marginBottom: '12px' }}>
          What This Tool Does
        </h3>
        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '16px' }}>
          The Case Pipeline Analyzer helps you understand the value of your current caseload and project future revenue. 
          By combining your case counts at each stage with historical fee data and win rates, you'll get:
        </p>
        <ul style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
          <li><strong style={{ color: '#e2e8f0' }}>Pipeline Value</strong> — Total expected revenue from current cases</li>
          <li><strong style={{ color: '#e2e8f0' }}>Stage Analysis</strong> — Revenue potential at each case stage</li>
          <li><strong style={{ color: '#e2e8f0' }}>Monthly Projections</strong> — Expected revenue timing</li>
          <li><strong style={{ color: '#e2e8f0' }}>Win Rate Impact</strong> — How outcomes affect your pipeline</li>
        </ul>
      </div>
      
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: '24px',
        fontSize: '12px',
        color: '#6ee7b7',
      }}>
        <strong>💡 Pro Tip:</strong> Your fee data is saved automatically and will be remembered for future sessions.
      </div>
      
      <button
        onClick={() => setStep(1)}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
        }}
      >
        Get Started →
      </button>
    </div>
  );

  // ============================================
  // STEP 1: FEE DATA INPUT
  // ============================================
  
  const renderStep1 = () => {
    if (feesLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          Loading your saved fee data...
        </div>
      );
    }
    
    // If fees already exist, show them with option to edit
    if (hasCompleteFees && feeInputMethod === null) {
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
            Your Saved Fee Data
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
            We found your previously saved average fees.
          </p>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {STAGES.map(stage => (
              <div key={stage.key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: stage.key !== 'federal_court' ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
              }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>{stage.label}</span>
                <span style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>
                  ${parseFloat(fees[stage.key]).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFeeInputMethod('direct')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#d8b4fe',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Edit Fees
            </button>
            <button
              onClick={() => setStep(1.5)}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Continue with These Fees →
            </button>
          </div>
        </div>
      );
    }
    
    // Show method selection if no method chosen yet
    if (feeInputMethod === null) {
      return (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
            Average Fee Data
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
            We've pre-loaded industry average fees. You can use these defaults or customize with your own data.
          </p>
          
          {/* Default Fees Display */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#6ee7b7', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Default Average Fees (Industry Data)
            </h3>
            {STAGES.map(stage => (
              <div key={stage.key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: stage.key !== 'federal_court' ? '1px solid rgba(16, 185, 129, 0.15)' : 'none',
              }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>{stage.label}</span>
                <span style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>
                  ${DEFAULT_FEES[stage.key].toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              Note: Federal Court fees are calculated separately using EAJA + 406A/B model
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setStep(1.5)}
              style={{
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              ✓ Use Default Fees & Continue
            </button>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setFeeInputMethod('direct')}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(168, 85, 247, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#d8b4fe', marginBottom: '4px' }}>
                  Enter My Own Fees
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  I know my average fees
                </div>
              </button>
              
              <button
                onClick={() => setFeeInputMethod('calculate')}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#a5b4fc', marginBottom: '4px' }}>
                  📊 Calculate From Data
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Enter wins & revenue by level
                </div>
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setStep(0)}
            style={{
              marginTop: '24px',
              padding: '10px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            ← Back
          </button>
        </div>
      );
    }
    
    // Direct fee input
    if (feeInputMethod === 'direct') {
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
            Enter Average Fees
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
            Enter your average fee (excluding closed no-fee cases) at each case stage.
          </p>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {STAGES.map((stage, idx) => (
              <div key={stage.key} style={{
                marginBottom: idx < STAGES.length - 1 ? '20px' : 0,
              }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                  {stage.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '14px',
                  }}>$</span>
                  <input
                    type="number"
                    value={fees[stage.key]}
                    onChange={(e) => setFees({ ...fees, [stage.key]: e.target.value })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 28px',
                      borderRadius: '10px',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      background: 'rgba(15, 15, 25, 0.8)',
                      color: '#f8fafc',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFeeInputMethod(null)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={async () => {
                await saveFeeData();
                setStep(1.5);
              }}
              disabled={!hasCompleteFees || feesSaving}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: hasCompleteFees && !feesSaving
                  ? 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)'
                  : 'rgba(168, 85, 247, 0.2)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: hasCompleteFees && !feesSaving ? 'pointer' : 'not-allowed',
              }}
            >
              {feesSaving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
          {feeSaveError && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              {feeSaveError}
            </div>
          )}
        </div>
      );
    }
    
    // Calculate method
    if (feeInputMethod === 'calculate') {
      return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
            Calculate Your Average Fees
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
            Enter the number of cases won and total revenue collected at each level (typically from the past 12 months).
          </p>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stage</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cases Won</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Fee</div>
            </div>
            
            {STAGES.map((stage, idx) => {
              const cases = parseFloat(calcData[stage.key].cases) || 0;
              const revenue = parseFloat(calcData[stage.key].revenue) || 0;
              const avgFee = cases > 0 ? revenue / cases : 0;
              
              return (
                <div key={stage.key} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  paddingBottom: idx < STAGES.length - 1 ? '16px' : 0,
                  marginBottom: idx < STAGES.length - 1 ? '16px' : 0,
                  borderBottom: idx < STAGES.length - 1 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
                }}>
                  <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{stage.label}</div>
                  <input
                    type="number"
                    value={calcData[stage.key].cases}
                    onChange={(e) => setCalcData({
                      ...calcData,
                      [stage.key]: { ...calcData[stage.key], cases: e.target.value }
                    })}
                    placeholder="0"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      background: 'rgba(15, 15, 25, 0.8)',
                      color: '#f8fafc',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontSize: '13px',
                    }}>$</span>
                    <input
                      type="number"
                      value={calcData[stage.key].revenue}
                      onChange={(e) => setCalcData({
                        ...calcData,
                        [stage.key]: { ...calcData[stage.key], revenue: e.target.value }
                      })}
                      placeholder="0"
                      style={{
                        padding: '8px 12px 8px 24px',
                        borderRadius: '8px',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        background: 'rgba(15, 15, 25, 0.8)',
                        color: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{
                    color: avgFee > 0 ? '#10b981' : '#64748b',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}>
                    {avgFee > 0 ? `$${avgFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFeeInputMethod(null)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => {
                calculateFeesFromData();
                setFeeInputMethod('direct');
              }}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Calculate & Review Fees →
            </button>
          </div>
        </div>
      );
    }
  };

  // ============================================
  // STEP 1.5: APPEAL & ATTRITION RATES
  // ============================================
  
  const renderStep1_5 = () => (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
        Appeal & Attrition Rates
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
        Not all denied cases continue to the next level. Enter your firm's typical appeal rates and overall attrition.
      </p>
      
      {/* Appeal Rates */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#a855f7', marginBottom: '16px' }}>
          Appeal Rates (% of denied cases that appeal)
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', color: '#e2e8f0' }}>
              Application → Reconsideration
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max="100"
                value={appealRates.applicationToRecon}
                onChange={(e) => setAppealRates({ ...appealRates, applicationToRecon: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(15, 15, 25, 0.8)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Industry average ~50%, represented claimants typically higher
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', color: '#e2e8f0' }}>
              Reconsideration → ALJ Hearing
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max="100"
                value={appealRates.reconToHearing}
                onChange={(e) => setAppealRates({ ...appealRates, reconToHearing: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(15, 15, 25, 0.8)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Most firms push to hearing level
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', color: '#e2e8f0' }}>
              ALJ Hearing → Appeals Council
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max="100"
                value={appealRates.hearingToAC}
                onChange={(e) => setAppealRates({ ...appealRates, hearingToAC: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(15, 15, 25, 0.8)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Many firms stop at hearing level
          </div>
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', color: '#e2e8f0' }}>
              Appeals Council → Federal Court
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max="100"
                value={appealRates.acToFederalCourt}
                onChange={(e) => setAppealRates({ ...appealRates, acToFederalCourt: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(15, 15, 25, 0.8)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Only some firms handle federal court appeals
          </div>
        </div>
      </div>
      
      {/* Attrition Rate */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fca5a5', marginBottom: '16px' }}>
          Overall Attrition Rate
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', color: '#e2e8f0' }}>
            Cases lost to attrition (death, lost contact, return to work, etc.)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="0"
              max="100"
              value={attritionRate}
              onChange={(e) => setAttritionRate(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              style={{
                width: '70px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(15, 15, 25, 0.8)',
                color: '#f8fafc',
                fontSize: '14px',
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>%</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          Applied across all stages. Typical range: 5-15%
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(2)}
          style={{
            flex: 2,
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  // ============================================
  // STEP 2: PIPELINE INPUT
  // ============================================
  
  const renderStep2 = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
        Current Case Pipeline
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
        Enter the number of open cases you have at each stage.
      </p>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        padding: '24px',
        marginBottom: '24px',
      }}>
        {STAGES.map((stage, idx) => (
          <div key={stage.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: idx < STAGES.length - 1 ? '20px' : 0,
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: stage.color,
              flexShrink: 0,
            }} />
            <label style={{ flex: 1, fontSize: '14px', color: '#e2e8f0' }}>
              {stage.label}
            </label>
            <input
              type="number"
              value={pipeline[stage.key]}
              onChange={(e) => setPipeline({ ...pipeline, [stage.key]: e.target.value })}
              placeholder="0"
              style={{
                width: '120px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${stage.color}40`,
                background: 'rgba(15, 15, 25, 0.8)',
                color: '#f8fafc',
                fontSize: '16px',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Quick Stats Preview */}
      {hasPipelineData && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '16px 20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '2px' }}>Total Open Cases</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                {formatNumber(analysis.totalCases)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '2px' }}>Pipeline Value</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                {formatCurrency(analysis.totalExpectedRevenue)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!hasPipelineData}
          style={{
            flex: 2,
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: hasPipelineData
              ? 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)'
              : 'rgba(168, 85, 247, 0.2)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: hasPipelineData ? 'pointer' : 'not-allowed',
          }}
        >
          Analyze Pipeline →
        </button>
      </div>
    </div>
  );

  // ============================================
  // STEP 3: ANALYSIS RESULTS
  // ============================================
  
  const renderStep3 = () => {
    const pieData = analysis.stageData
      .filter(s => s.expectedRevenue > 0)
      .map(s => ({
        name: s.shortLabel,
        value: s.expectedRevenue,
        color: s.color,
      }));
    
    const barData = analysis.stageData.map(s => ({
      name: s.shortLabel,
      cases: s.caseCount,
      revenue: s.expectedRevenue,
      color: s.color,
    }));
    
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px', textAlign: 'center' }}>
          Pipeline Analysis
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>
          Based on your case counts, average fees, and SSA 2024 win rate data
        </p>
        
        {/* Summary Cards - Row 1: Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: '#d8b4fe', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Open Cases
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f8fafc' }}>
              {formatNumber(analysis.totalCases)}
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Pipeline Value
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
              {formatCurrency(analysis.totalPipelineValue)}
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Expected Wins
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
              {analysis.totalExpectedWins.toFixed(0)}
            </div>
          </div>
        </div>
        
        {/* Revenue Timeline Projections */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fbbf24', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📅 Revenue Timeline Projections
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            Estimated revenue realization based on SSA processing times and case stage
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{
              background: 'rgba(15, 15, 25, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Within 1 Year</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fbbf24' }}>
                {formatCurrency(analysis.timeProjections.year1)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                {analysis.totalPipelineValue > 0 ? ((analysis.timeProjections.year1 / analysis.totalPipelineValue) * 100).toFixed(0) : 0}% of pipeline
              </div>
            </div>
            <div style={{
              background: 'rgba(15, 15, 25, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Within 3 Years</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                {formatCurrency(analysis.timeProjections.year3)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                {analysis.totalPipelineValue > 0 ? ((analysis.timeProjections.year3 / analysis.totalPipelineValue) * 100).toFixed(0) : 0}% of pipeline
              </div>
            </div>
            <div style={{
              background: 'rgba(15, 15, 25, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Within 5 Years</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                {formatCurrency(analysis.timeProjections.year5)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                {analysis.totalPipelineValue > 0 ? ((analysis.timeProjections.year5 / analysis.totalPipelineValue) * 100).toFixed(0) : 0}% of pipeline
              </div>
            </div>
          </div>
        </div>
        
        {/* EAJA & 406A/B Breakdown (only show if there are federal court projections) */}
        {(analysis.totalEAJAValue > 0 || analysis.totalFee406ABValue > 0) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(217, 70, 239, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(217, 70, 239, 0.3)',
            padding: '24px',
            marginBottom: '32px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e879f9', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚖️ Federal Court Revenue Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{
                background: 'rgba(15, 15, 25, 0.6)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>EAJA Fees (Remands)</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#e879f9' }}>
                  {formatCurrency(analysis.totalEAJAValue)}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  @${USDC_CONSTANTS.avgEAJAFee.toLocaleString()} avg per remand
                </div>
              </div>
              <div style={{
                background: 'rgba(15, 15, 25, 0.6)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>406A/B Fees (Remand Wins)</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#d946ef' }}>
                  {formatCurrency(analysis.totalFee406ABValue)}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  @${USDC_CONSTANTS.avg406ABFee.toLocaleString()} avg per win
                </div>
              </div>
              <div style={{
                background: 'rgba(15, 15, 25, 0.6)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Total Federal Court Value</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f0abfc' }}>
                  {formatCurrency(analysis.totalEAJAValue + analysis.totalFee406ABValue)}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  EAJA + 406A/B combined
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Based on {(USDC_CONSTANTS.remandRate * 100).toFixed(0)}% remand rate, {(USDC_CONSTANTS.remandWinRate * 100).toFixed(0)}% of remands win on remand
            </div>
          </div>
        )}
        
        {/* USDC Opportunity Alert */}
        {analysis.usdcOpportunity.isOpportunity && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
            borderRadius: '16px',
            border: '2px solid rgba(34, 197, 94, 0.5)',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>💰</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e', marginBottom: '8px' }}>
                  Federal Court Opportunity Identified
                </h3>
                <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '16px', lineHeight: '1.6' }}>
                  Only <strong>{(analysis.usdcOpportunity.currentRate * 100).toFixed(1)}%</strong> of your hearing denials currently reach Federal Court. 
                  Industry best practice suggests <strong>50%</strong> of UFD denials should be appealed to USDC.
                </p>
                
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                  <strong>{analysis.usdcOpportunity.additionalCasesToUSDC.toFixed(0)}</strong> additional cases could reach USDC
                </div>
                
                {/* Two-column comparison: In-House vs Referral */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* In-House Scenario */}
                  <div style={{
                    background: 'rgba(15, 15, 25, 0.6)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}>
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🏢 Handle In-House
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>EAJA Fees</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#e879f9' }}>
                        +{formatCurrency(analysis.usdcOpportunity.additionalEAJA)}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>406A/B Fees</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#d946ef' }}>
                        +{formatCurrency(analysis.usdcOpportunity.additional406AB)}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '6px',
                      padding: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '10px', color: '#86efac', marginBottom: '2px' }}>Total Additional</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>
                        +{formatCurrency(analysis.usdcOpportunity.totalAdditionalRevenue)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Referral Scenario */}
                  <div style={{
                    background: 'rgba(15, 15, 25, 0.6)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🤝 Refer Out (25% Fee)
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>EAJA Referral Fee</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#fbbf24' }}>
                        +{formatCurrency(analysis.usdcOpportunity.referralEAJA)}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>406A/B Referral Fee</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#f59e0b' }}>
                        +{formatCurrency(analysis.usdcOpportunity.referral406AB)}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      borderRadius: '6px',
                      padding: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '10px', color: '#fcd34d', marginBottom: '2px' }}>Total Referral Revenue</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
                        +{formatCurrency(analysis.usdcOpportunity.totalReferralRevenue)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                  Based on {(USDC_CONSTANTS.remandRate * 100).toFixed(0)}% remand rate, ${USDC_CONSTANTS.avgEAJAFee.toLocaleString()} avg EAJA fee, 
                  {(USDC_CONSTANTS.remandWinRate * 100).toFixed(0)}% remand win rate, ${USDC_CONSTANTS.avg406ABFee.toLocaleString()} avg 406A/B fee. 
                  Referral assumes {(USDC_CONSTANTS.referralFeePercent * 100).toFixed(0)}% fee split.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Revenue by Stage Bar Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#a855f7', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Expected Revenue by Stage
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [formatCurrency(value), 'Expected Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Revenue Distribution Pie Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#a855f7', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revenue Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {pieData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }} />
                  <span style={{ color: '#94a3b8' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Stage Detail Table */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          padding: '24px',
          marginBottom: '32px',
          overflowX: 'auto',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#a855f7', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Stage-by-Stage Breakdown
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Stage</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Cases</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Win Rate</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Exp. Wins</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Avg Fee</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Exp. Revenue</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontWeight: '500' }}>Avg Wait</th>
              </tr>
            </thead>
            <tbody>
              {analysis.stageData.map((stage, idx) => (
                <tr key={stage.key} style={{ borderBottom: idx < analysis.stageData.length - 1 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: stage.color }} />
                      <span style={{ color: '#e2e8f0' }}>{stage.label}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#f8fafc', fontWeight: '500' }}>
                    {formatNumber(stage.caseCount)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8' }}>
                    {(stage.winRate * 100).toFixed(0)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#3b82f6' }}>
                    {stage.expectedWins.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8' }}>
                    ${stage.avgFee.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#10b981', fontWeight: '600' }}>
                    {formatCurrency(stage.expectedRevenue)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontSize: '12px' }}>
                    ~{stage.avgMonthsToDecision}mo
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(168, 85, 247, 0.3)' }}>
                <td style={{ padding: '12px 8px', color: '#f8fafc', fontWeight: '600' }}>Total</td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#f8fafc', fontWeight: '600' }}>
                  {formatNumber(analysis.totalCases)}
                </td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b' }}>—</td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#3b82f6', fontWeight: '600' }}>
                  {analysis.totalExpectedWins.toFixed(0)}
                </td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b' }}>—</td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#94a3b8', fontSize: '12px' }}>
                  {formatCurrency(analysis.totalDirectRevenue)}
                </td>
                <td style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b' }}>—</td>
              </tr>
              <tr style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <td colSpan="5" style={{ padding: '12px 8px', color: '#6ee7b7', fontWeight: '600', fontSize: '13px' }}>
                  Total Pipeline Value (incl. appeal potential, minus {attritionRate}% attrition)
                </td>
                <td colSpan="2" style={{ textAlign: 'right', padding: '12px 8px', color: '#10b981', fontWeight: '700', fontSize: '16px' }}>
                  {formatCurrency(analysis.totalPipelineValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStep(2)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ← Edit Pipeline
          </button>
          <button
            onClick={() => setStep(1.5)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Edit Appeal Rates
          </button>
          <button
            onClick={() => {
              setStep(1);
              setFeeInputMethod('direct');
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              background: 'rgba(168, 85, 247, 0.1)',
              color: '#d8b4fe',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Edit Fees
          </button>
          <button
            onClick={() => setStep(0)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Start Over
          </button>
        </div>
        
        {/* Data Sources & Security Footer */}
        <div style={{
          marginTop: '32px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '10px',
          color: '#94a3b8',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#a5b4fc' }}>📊 Data Sources:</strong>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Win Rates:</strong> {analysis.dataSources.winRates}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Wait Times:</strong> {analysis.dataSources.waitTimes}
          </div>
          <div style={{ borderTop: '1px solid rgba(99, 102, 241, 0.2)', paddingTop: '8px', marginTop: '8px' }}>
            🔒 Your pipeline data is processed locally. Only your average fee settings are saved to your account.
          </div>
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
      {/* Background effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />
      
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(217, 70, 239, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 1.5 && renderStep1_5()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
