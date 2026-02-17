'use client';

import { createContext, useContext, useState } from 'react';

const DemoContext = createContext({
  isDemoMode: false,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
  DEMO_DATA: {},
});

export const useDemo = () => useContext(DemoContext);

// Realistic sample data for all tools
export const DEMO_DATA = {
  kpis: {
    avg_fee_per_sign_up: 2800,
    closed_no_fee_percent: 42,
    application_fee: 3500,
    reconsideration_fee: 3000,
    hearing_fee: 6500,
    appeals_council_fee: 5000,
    federal_court_fee: 7000,
    application_win_rate: 0.36,
    reconsideration_win_rate: 0.14,
    hearing_win_rate: 0.54,
    appeals_council_win_rate: 0.13,
    federal_court_win_rate: 0.64,
    application_adj_months: 8,
    reconsideration_adj_months: 7,
    hearing_adj_months: 11,
    appeals_council_adj_months: 9,
    federal_court_adj_months: 15,
    application_payment_lag_days: 45,
    reconsideration_payment_lag_days: 45,
    hearing_payment_lag_days: 60,
    appeals_council_payment_lag_days: 60,
    federal_court_payment_lag_days: 90,
    eaja_fee: 6500,
    eaja_adj_months: 6,
    eaja_payment_lag_days: 90,
  },
  pipeline: {
    fees: {
      application: '3500',
      reconsideration: '3000',
      hearing: '6500',
      appeals_council: '5000',
      federal_court: '7000',
    },
    pipeline: {
      application: '120',
      reconsideration: '85',
      hearing: '340',
      appeals_council: '45',
      federal_court: '20',
    },
    winRates: {
      application: 0.36,
      reconsideration: 0.14,
      hearing: 0.54,
      appeals_council: 0.13,
      federal_court: 0.64,
    },
    appealRates: {
      applicationToRecon: 85,
      reconToHearing: 90,
      hearingToAC: 35,
      acToFederalCourt: 0,
    },
    attritionRate: 10,
  },
  campaigns: [
    { name: 'Google Ads - SSD', dateStart: '2025-01-01', dateEnd: '2025-03-31', spend: '15000', leads: '320', wanted: '128', signed: '64' },
    { name: 'Facebook - Disability', dateStart: '2025-01-01', dateEnd: '2025-03-31', spend: '8500', leads: '180', wanted: '72', signed: '29' },
    { name: 'TV Spots - Local', dateStart: '2025-02-01', dateEnd: '2025-03-31', spend: '25000', leads: '210', wanted: '84', signed: '42' },
  ],
  steadyState: {
    firmName: 'Demo SSD Firm',
    closedNoFeePercent: '42',
    recentMonthlyIntake: { month1: '55', month2: '48', month3: '52' },
  },
};

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const enterDemoMode = () => setIsDemoMode(true);
  const exitDemoMode = () => {
    setIsDemoMode(false);
    // Force page reload to clear demo state
    window.location.reload();
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemoMode, exitDemoMode, DEMO_DATA }}>
      {children}
    </DemoContext.Provider>
  );
}
