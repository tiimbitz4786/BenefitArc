import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
// XLSX is dynamically imported only when an Excel file is uploaded (see parseFile)
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import ExportToolbar from './ExportToolbar';
import ScenarioSelector from './ScenarioSelector';
import useSavedScenarios from '@/hooks/useSavedScenarios';

// ============================================
// BENEFITARC T12 P&L ANALYSIS
// Trailing 12-Month P&L Analysis Tool
// Social Security Practice Only
// ============================================

const CATEGORIES = {
  MARKETING: 'marketing',
  LABOR: 'labor',
  OTHER: 'other',
};

const CATEGORY_CONFIG = {
  [CATEGORIES.MARKETING]: {
    label: 'Marketing',
    description: 'Cost of acquiring cases',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  [CATEGORIES.LABOR]: {
    label: 'Labor',
    description: 'Wages, benefits & payroll taxes',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  },
  [CATEGORIES.OTHER]: {
    label: 'Other',
    description: 'All other operating expenses',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
};

// ============================================
// FLEXIBLE KEYWORD DETECTION
// ============================================

// Keywords that indicate Social Security / Disability practice (INCLUDE)
const SS_KEYWORDS = [
  // Direct SS terms
  'social security', 'ssd', 'ssdi', 'ssi', 
  'ss fees', 'ss fee', 'ssd fees', 'ssd fee', 'ssdi fees', 'ssdi fee',
  'social security disability', 'social security fees',
  // Disability (when not VA or other)
  'disability fee', 'disability fees', 'disability law', 'disability practice',
  // Fee types specific to SS
  '406a', '406b', '406(a)', '406(b)', 'eaja',
  // SS-specific process terms
  'hearing attorney', 'alj', 'administrative law judge',
  'appeals council', 'reconsideration', 'cessation',
  'usdc', 'district court', 'federal court',
  // SS administration terms
  'ssa', 'social security administration',
  'odar', 'oho', 'office of hearings',
  'dds', 'disability determination',
];

// Keywords that indicate OTHER practice areas - NOT Social Security (EXCLUDE)
const NON_SS_KEYWORDS = [
  // Personal Injury
  'personal injury', 'pi', 'p.i.',
  'mva', 'motor vehicle', 'auto accident', 'car accident', 'truck accident',
  'slip and fall', 'slip & fall', 'premises liability',
  'product liability', 'products liability',
  'wrongful death', 'catastrophic injury',
  'dog bite', 'animal attack',
  'construction accident', 'workplace injury',
  'brain injury', 'tbi', 'spinal cord',
  
  // Veterans / VA
  'va', 'v.a.', 'veteran', 'veterans', 
  'va disability', 'veterans disability', 'veterans affairs', "veteran's affairs", "veterans' affairs",
  'va benefits', 'veteran benefits', 'veterans benefits',
  'military', 'service-connected',
  
  // Medical Malpractice
  'medical malpractice', 'med mal',
  'nursing home', 'nursing home abuse', 'elder abuse',
  'birth injury', 'surgical error', 'misdiagnosis',
  'hospital negligence', 'doctor negligence',
  
  // Workers Compensation
  'workers comp', 'worker\'s comp', 'workman', 'workmen',
  'workers compensation', 'worker\'s compensation',
  'work comp', 'work injury', 'occupational',
  
  // Criminal
  'criminal', 'criminal defense', 'criminal law',
  'dui', 'dwi', 'drunk driving',
  'felony', 'misdemeanor', 'traffic',
  'drug', 'narcotics', 'possession',
  'assault', 'battery', 'theft', 'robbery', 'burglary',
  'domestic violence', 'restraining order',
  
  // Family Law
  'family law', 'family', 'divorce', 'dissolution',
  'custody', 'child custody', 'child support',
  'alimony', 'spousal support', 'visitation',
  'adoption', 'guardianship', 'paternity',
  'prenuptial', 'prenup', 'postnuptial',
  
  // Estate / Probate
  'estate', 'estate planning', 'probate',
  'trust', 'trusts', 'will', 'wills',
  'inheritance', 'executor', 'beneficiary',
  
  // Real Estate
  'real estate', 'property', 'closing',
  'title', 'mortgage', 'foreclosure',
  'landlord', 'tenant', 'eviction', 'lease',
  
  // Business / Corporate
  'corporate', 'business law', 'business',
  'contract', 'contracts', 'commercial',
  'merger', 'acquisition', 'llc', 'incorporation',
  'partnership', 'shareholder',
  
  // Immigration
  'immigration', 'immigrant', 'visa',
  'green card', 'citizenship', 'naturalization',
  'deportation', 'asylum', 'uscis',
  
  // Bankruptcy
  'bankruptcy', 'chapter 7', 'chapter 11', 'chapter 13',
  'debt relief', 'creditor', 'debtor',
  
  // Intellectual Property
  'intellectual property', 'ip ', 'i.p.',
  'patent', 'trademark', 'copyright',
  'trade secret',
  
  // Employment Law (not SS disability)
  'employment law', 'employment',
  'wrongful termination', 'discrimination',
  'harassment', 'eeoc', 'ada ',
  
  // Tax
  'tax law', 'tax ', 'irs', 'tax court',
  
  // Other
  'litigation', 'civil litigation', 'civil rights',
  'class action', 'mass tort',
  'medicare', // Medicare is different from SS Disability
  'medicaid',
  'erc', 'employee retention', // Tax credits, not practice area but exclude from revenue
];

// Keywords that indicate Marketing/Advertising section
const MARKETING_SECTION_KEYWORDS = [
  'marketing', 'advertising', 'ads', 'advertisement',
  'brand', 'branding', 'promotion', 'promotional',
  'media', 'tv', 'television', 'radio', 'outdoor', 'billboard',
  'digital', 'ppc', 'seo', 'lead', 'leads', 'acquisition',
  // Expanded marketing keywords
  'marketing expense', 'marketing expenses', 'advertising expense', 'advertising expenses',
  'ad spend', 'google ads', 'facebook ads', 'meta ads', 'bing ads',
  'social media', 'content marketing', 'email marketing',
  'pay per click', 'cost per click', 'cpc', 'cpm', 'cpl', 'cpa',
  'web design', 'graphic design', 'creative services',
  'public relations', 'pr', 'sponsorship', 'sponsorships',
  'trade show', 'trade shows', 'event marketing',
  'direct mail', 'mailer', 'mailers', 'flyer', 'flyers',
  'referral', 'referrals', 'referral fees', 'referral marketing',
  'marketing consultant', 'agency', 'ad agency',
  'signage', 'signs', 'banner', 'banners',
  'yellow pages', 'directory', 'listing',
  'commercial', 'jingle', 'spot',
  'retargeting', 'remarketing', 'display ads',
  'video production', 'photography',
  'market research', 'focus group',
  'print advertising', 'newspaper', 'magazine',
  // QuickBooks defaults
  'advertising and promotion', 'marketing and advertising',
];

// Keywords that indicate Labor/Wages section
const LABOR_SECTION_KEYWORDS = [
  // General labor terms
  'labor', 'labour', 'wages', 'wage', 'salary', 'salaries',
  'payroll', 'compensation', 'employee', 'staff', 'personnel',
  // Legal industry specific roles
  'case manager', 'case managers', 'paralegal', 'paralegals',
  'legal assistant', 'legal assistants', 'attorney', 'attorneys',
  'hearing attorney', 'usdc attorney', 'scheduler', 'schedulers',
  'receptionist', 'receptionists', 'file clerk', 'file clerks',
  'admin', 'administrative', 'bookkeeper', 'bookkeepers',
  'controller', 'controllers', 'executive', 'executives',
  'cfo', 'ceo', 'cto', 'cmo', 'manager', 'managers',
  'document specialist', 'document specialists', 'docs',
  'medical records clerk', 'medical records clerks',
  'intake specialist', 'intake specialists',
  'fee coordinator', 'fee coordinators',
  'floater', 'floaters',
  // IT
  'it', 'information technology',
  // Benefits & Insurance (employee-related)
  'benefits', 'benefit', 'insurance', 'insurances',
  'health insurance', 'health ins', 'medical insurance', 'medical ins',
  'stop loss', 'stop-loss', 'stoploss',
  'disability insurance', 'disability ins', 'ltd', 'std', 'short term disability', 'long term disability',
  'dental', 'dental insurance', 'dental benefits',
  'vision', 'vision insurance', 'vision benefits',
  'life insurance', 'life ins', 'employee life', 'spouse life', 'child life',
  '401k', '401(k)', 'retirement', 'pension', 'ira', 'sep', 'simple ira',
  'hsa', 'health savings', 'fsa', 'flexible spending', 'dcfsa', 'dependent care',
  'pto', 'paid time off', 'vacation', 'sick leave', 'sick time',
  'workers comp', 'workers compensation', 'worker\'s comp', 'workman\'s comp',
  'unemployment', 'unemployment insurance', 'sui', 'suta', 'futa',
  'fica', 'social security tax', 'medicare tax', 'payroll tax', 'employer tax',
  'pfl', 'paid family leave', 'fmla', 'family medical leave',
  'cobra', 'continuation coverage',
  'tpa', 'third party administrator', 'claims', 'medical claims', 'pharmacy claims',
  'premium', 'premiums', 'contribution', 'contributions',
  'malpractice', 'professional liability', 'e&o', 'errors and omissions',
  'bonus', 'bonuses', 'commission', 'commissions', 'incentive', 'incentives',
  'outsource', 'outsourcing', 'staffing', 'temp', 'temporary',
  // Expanded labor keywords
  'labor expense', 'labor expenses', 'labor cost', 'labor costs',
  'employee expense', 'employee expenses', 'staff expense', 'staff expenses',
  'staff cost', 'staff costs', 'personnel expense', 'personnel expenses',
  'human resources', 'hr', 'headcount',
  'gross wages', 'net wages', 'gross pay', 'net pay', 'take home',
  'overtime', 'ot', 'regular pay', 'hourly', 'salaried',
  'direct deposit',
  'w-2', 'w2', '1099',
  'garnishment', 'garnishments', 'child support',
  'employee benefits', 'fringe', 'fringe benefits',
  'group health', 'group insurance', 'group life',
  'employee assistance', 'eap',
  'tuition reimbursement', 'student loan',
  'uniform', 'uniforms',
  'background check', 'drug test', 'drug testing',
  'recruiting', 'recruitment', 'hiring', 'onboarding',
  'severance', 'termination', 'separation',
  'per diem', 'stipend', 'allowance',
  'holiday pay', 'holiday', 'holidays',
  'bereavement', 'jury duty',
  // QuickBooks defaults
  'payroll expenses', 'payroll expense',
  'employee benefit expenses', 'employee benefit expense',
  'salaries and wages', 'wages and salaries',
  'officer compensation', 'officers compensation',
  'guaranteed payments', 'partner compensation',
  'contract labor', 'subcontractor', 'subcontractors',
];

const OTHER_KEYWORDS = [
  // Occupancy
  'rent', 'lease', 'building', 'office space', 'occupancy',
  'mortgage', 'property tax', 'property taxes',
  // Utilities
  'utilities', 'utility', 'electric', 'electricity', 'gas', 'water',
  'sewer', 'trash', 'waste', 'internet', 'telephone', 'phone',
  'cable', 'wifi', 'wi-fi', 'broadband',
  // Office & Supplies
  'office supplies', 'office expense', 'supplies', 'postage',
  'shipping', 'freight', 'printing', 'copies', 'copier',
  'stationery', 'toner', 'ink', 'paper',
  // Professional Services (non-employee)
  'accounting', 'accountant', 'cpa', 'audit', 'tax preparation',
  'legal fees', 'consulting', 'consultant', 'professional fees',
  'professional services', 'outside services',
  // Technology (non-staffing)
  'software', 'subscription', 'subscriptions', 'saas', 'license',
  'licenses', 'cloud', 'hosting', 'domain', 'website',
  'computer', 'hardware', 'equipment', 'maintenance',
  'repairs', 'repair', 'tech support',
  // Insurance (non-employee, business insurance)
  'general liability', 'property insurance', 'business insurance',
  'umbrella insurance', 'cyber insurance', 'flood insurance',
  // Financial
  'bank charges', 'bank fees', 'merchant fees', 'processing fees',
  'credit card fees', 'interest expense', 'interest',
  'finance charge', 'late fees', 'loan', 'line of credit',
  // Depreciation & Amortization
  'depreciation', 'amortization', 'accumulated depreciation',
  // Travel & Entertainment
  'travel', 'meals', 'entertainment', 'lodging', 'hotel',
  'airfare', 'mileage', 'parking', 'tolls', 'uber', 'lyft',
  // Dues & Education
  'dues', 'memberships', 'bar dues', 'association',
  'continuing education', 'training', 'seminar', 'conference',
  'cle', 'education',
  // Miscellaneous
  'miscellaneous', 'misc', 'sundry', 'other expense',
  'janitorial', 'cleaning', 'security', 'alarm',
  'filing fees', 'court costs', 'court fees',
  'process server', 'subpoena', 'deposition',
  'expert witness', 'investigation', 'investigator',
  'medical records', 'record retrieval',
  'charitable', 'donations', 'contribution',
  'bad debt', 'write-off', 'write off',
  'penalties', 'fines',
  'moving', 'relocation',
  'furniture', 'fixtures',
];

const NOT_MARKETING_KEYWORDS = [
  // Labor items that might appear under a marketing section
  'salary', 'salaries', 'wages', 'wage', 'payroll',
  'bonus', 'bonuses', 'commission', 'commissions',
  'benefits', 'insurance', 'health insurance', '401k', '401(k)',
  'retirement', 'fica', 'payroll tax', 'workers comp',
  'pto', 'paid time off', 'vacation',
  // Other items that might appear under a marketing section
  'rent', 'lease', 'utilities', 'utility', 'telephone',
  'office supplies', 'equipment', 'depreciation',
  'bank charges', 'bank fees', 'interest',
  'travel', 'meals', 'dues', 'memberships',
];

const NOT_LABOR_KEYWORDS = [
  // Marketing items that might appear under a labor section
  'advertising', 'advertisement', 'ads', 'ad spend',
  'marketing', 'promotion', 'promotional',
  'media', 'billboard', 'tv', 'television', 'radio',
  'seo', 'ppc', 'google ads', 'facebook ads',
  'lead generation', 'leads', 'acquisition',
  // Other items that might appear under a labor section
  'rent', 'lease', 'utilities', 'utility',
  'office supplies', 'equipment', 'depreciation',
  'bank charges', 'bank fees', 'interest',
  'software', 'subscription', 'license',
];

// Keywords that indicate an expense section (not revenue)
const EXPENSE_SECTION_KEYWORDS = [
  'expense', 'expenses', 'cost', 'costs', 'expenditure',
];

// Keywords that indicate Income/Revenue
const INCOME_KEYWORDS = [
  'income', 'revenue', 'fees', 'fee', 'earnings', 'receipts',
];

// Revenue items to EXCLUDE from firm revenue calculation (one-time, non-operating)
const EXCLUDED_REVENUE_KEYWORDS = [
  'erc', 'employee retention credit', 'employee retention tax credit',
  'ertc', 'tax credit', 'covid', 'cares act', 'ppp', 'paycheck protection',
  'grant', 'stimulus', 'relief fund', 'forgiveness',
  'interest income', 'other income', 'miscellaneous income',
  'gain on sale', 'asset sale', 'one-time', 'one time',
  'extraordinary', 'non-operating',
];

// Pre-compile RegExp cache for short keywords (built once at module load)
const keywordRegexCache = new Map();
const getKeywordRegex = (kw) => {
  if (!keywordRegexCache.has(kw)) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    keywordRegexCache.set(kw, new RegExp('\\b' + escaped + '\\b', 'i'));
  }
  return keywordRegexCache.get(kw);
};

// Pre-compute lowercased keyword sets for O(1) substring checks
const SS_KEYWORDS_LOWER = SS_KEYWORDS.map(kw => kw.toLowerCase());
const NON_SS_KEYWORDS_LOWER = NON_SS_KEYWORDS.map(kw => kw.toLowerCase());

// Helper: Check if text contains any keyword from a list
// Uses word boundaries for short keywords to avoid false matches
const containsKeyword = (text, keywords) => {
  const lower = text.toLowerCase();
  return keywords.some(kw => {
    const kwLower = kw.toLowerCase();
    if (kwLower.length <= 3 && !kwLower.includes(' ')) {
      return getKeywordRegex(kwLower).test(lower);
    }
    return lower.includes(kwLower);
  });
};

// Helper: Check if text is SS-related
const isSSRelated = (text) => {
  const lower = text.toLowerCase();
  const hasSSKeyword = containsKeyword(text, SS_KEYWORDS);
  const hasExclusion = NON_SS_KEYWORDS_LOWER.some(kw => lower.includes(kw));
  return hasSSKeyword && !hasExclusion;
};

// Keywords that clearly indicate a non-SS practice area in an expense description.
// Narrower than NON_SS_KEYWORDS to avoid false positives on generic overhead
// (e.g., "lease", "property", "business" could be firm overhead, not practice-area expenses).
const NON_SS_PRACTICE_KEYWORDS = [
  // Personal Injury
  'personal injury', 'mva', 'motor vehicle', 'auto accident', 'car accident',
  'truck accident', 'slip and fall', 'slip & fall', 'premises liability',
  'product liability', 'products liability', 'wrongful death', 'catastrophic injury',
  'dog bite', 'animal attack',
  // Medical Malpractice
  'medical malpractice', 'med mal', 'nursing home abuse', 'elder abuse',
  'birth injury', 'surgical error', 'misdiagnosis',
  // Workers Compensation
  'workers comp', "worker's comp", 'workers compensation', "worker's compensation",
  'work comp',
  // Criminal
  'criminal defense', 'criminal law', 'dui', 'dwi',
  // Family Law
  'family law', 'divorce', 'child custody', 'child support', 'alimony',
  'spousal support',
  // Immigration
  'immigration', 'deportation', 'asylum', 'uscis', 'green card',
  // Bankruptcy
  'bankruptcy', 'chapter 7', 'chapter 11', 'chapter 13',
  // Intellectual Property
  'patent', 'trademark', 'copyright', 'trade secret',
];

// Helper: Check if an expense description clearly belongs to a non-SS practice area
const isNonSSExpense = (text) => {
  if (containsKeyword(text, SS_KEYWORDS)) return false; // Has SS signal, don't exclude
  return containsKeyword(text, NON_SS_PRACTICE_KEYWORDS);
};

// Helper: Check if text is a "Total for X" line and extract section name
const getTotalForSection = (text) => {
  const lower = text.toLowerCase();
  if (lower.startsWith('total for ')) {
    return text.substring(10).trim();
  }
  if (lower.startsWith('total ') && !lower.includes('total revenue') && !lower.includes('total income')) {
    return text.substring(6).trim();
  }
  return null;
};

// Normalize description for consistent rule matching
const normalizeDescription = (desc) => desc.toLowerCase().trim().replace(/\s+/g, ' ');

export default function T12Analyzer() {
  const { user } = useAuth();

  // Steps: 0 = welcome, 1 = upload, 1.5 = resolve uncategorized, 2 = categorize SS expenses, 3 = report
  const [step, setStep] = useState(0);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [plData, setPlData] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [categorizedItems, setCategorizedItems] = useState([]);
  const [uncategorizedItems, setUncategorizedItems] = useState([]); // Items that need user decision
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalFirmRevenue, setTotalFirmRevenue] = useState(0); // For calculating SS percentage
  const [ssRevenuePercent, setSsRevenuePercent] = useState(0); // SS as % of total firm revenue
  const [ssEmployeePercent, setSsEmployeePercent] = useState(null); // null = not yet entered
  const [ssAdPercent, setSsAdPercent] = useState(null); // null = not yet entered
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const contentRef = useRef(null);

  const scenarioHook = useSavedScenarios('t12-analysis');
  const getDataToSave = () => ({
    categorizedItems, totalRevenue, totalFirmRevenue, ssRevenuePercent,
  });
  const handleLoadScenario = async (id) => {
    const s = await scenarioHook.loadScenario(id);
    if (s?.data) {
      if (s.data.categorizedItems) setCategorizedItems(s.data.categorizedItems);
      if (s.data.totalRevenue != null) setTotalRevenue(s.data.totalRevenue);
      if (s.data.totalFirmRevenue != null) setTotalFirmRevenue(s.data.totalFirmRevenue);
      if (s.data.ssRevenuePercent != null) setSsRevenuePercent(s.data.ssRevenuePercent);
      setStep(3); // go to results
    }
  };

  // Saved categorization rules
  const [savedRules, setSavedRules] = useState({});
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaveError, setRulesSaveError] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesSearchTerm, setRulesSearchTerm] = useState('');

  // ============================================
  // LOAD SAVED CATEGORIZATION RULES
  // ============================================

  useEffect(() => {
    const loadRules = async () => {
      if (!user) {
        setRulesLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('t12_categorization_rules')
          .select('id, description_key, description_display, decision, partial_percent, category, updated_at')
          .eq('user_id', user.id);

        if (error) throw error;

        if (data) {
          const rulesMap = {};
          data.forEach(rule => {
            rulesMap[rule.description_key] = {
              id: rule.id,
              descriptionDisplay: rule.description_display,
              decision: rule.decision,
              partialPercent: rule.partial_percent,
              category: rule.category,
              updatedAt: rule.updated_at,
            };
          });
          setSavedRules(rulesMap);
        }
      } catch (err) {
        // Rules load failed - tool still works, just without memory
      } finally {
        setRulesLoading(false);
      }
    };

    loadRules();
  }, [user]);

  // ============================================
  // SAVE / DELETE CATEGORIZATION RULES
  // ============================================

  const saveRule = useCallback(async (description, decision, partialPercent = null, category = null) => {
    if (!user) return;

    const descriptionKey = normalizeDescription(description);

    // Optimistic local update
    setSavedRules(prev => ({
      ...prev,
      [descriptionKey]: {
        descriptionDisplay: description,
        decision,
        partialPercent,
        category,
        updatedAt: new Date().toISOString(),
      },
    }));

    // Persist to Supabase
    try {
      const { error } = await supabase
        .from('t12_categorization_rules')
        .upsert({
          user_id: user.id,
          description_key: descriptionKey,
          description_display: description,
          decision,
          partial_percent: partialPercent,
          category,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,description_key' });

      if (error) throw error;
    } catch (err) {
      setRulesSaveError('Failed to save rule');
      setTimeout(() => setRulesSaveError(''), 3000);
    }
  }, [user]);

  const deleteRule = useCallback(async (descriptionKey) => {
    if (!user) return;

    // Optimistic local removal
    setSavedRules(prev => {
      const next = { ...prev };
      delete next[descriptionKey];
      return next;
    });

    try {
      const { error } = await supabase
        .from('t12_categorization_rules')
        .delete()
        .eq('user_id', user.id)
        .eq('description_key', descriptionKey);

      if (error) throw error;
    } catch (err) {
      // Delete failed silently - rule will reappear on next load
    }
  }, [user]);

  // Parse uploaded P&L file - Categorize items as SS, Non-SS, or Uncategorized
  const parseFile = useCallback(async (file) => {
    setIsProcessing(true);
    setParseError(null);
    
    try {
      let text = '';
      
      // Handle xlsx files using SheetJS
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to CSV format
        text = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        // Handle CSV/TXT files
        text = await file.text();
      }
      
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim());
      
      const ssItems = [];           // Clearly SS-related expenses
      const uncategorized = [];     // Needs user decision
      let ssRevenue = 0;
      let firmRevenue = 0;
      let excludedRevenue = 0;      // Track excluded items like ERC
      let ssRevenueSource = '';
      
      // Track document sections
      let inIncomeSection = false;
      let inExpenseSection = false;
      
      // Track hierarchy
      const sectionStack = [];
      
      // Track context
      let inMarketingParent = false;
      let inLaborParent = false;
      let inSSSubsection = false;
      let inNonSSSubsection = false;
      let ssSubsectionType = null;
      let currentPath = '';
      
      // First pass: parse all lines
      const parsedLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV
        let description = '';
        let amountStr = '';
        
        const parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        
        if (parts.length < 2) {
          description = parts[0].replace(/"/g, '').trim();
          amountStr = '';
        } else {
          description = parts[0].replace(/"/g, '').trim();
          amountStr = parts[1].replace(/"/g, '').trim();
        }
        
        const cleanAmountStr = amountStr.replace(/[$,\s]/g, '');
        let isNegative = cleanAmountStr.includes('(') || cleanAmountStr.startsWith('-');
        const numericStr = cleanAmountStr.replace(/[()]/g, '').replace('-', '');
        const amount = parseFloat(numericStr) || 0;
        const finalAmount = isNegative ? -amount : amount;
        const hasAmount = numericStr.length > 0 && !isNaN(parseFloat(numericStr));
        
        parsedLines.push({
          lineNum: i,
          description,
          amount,
          finalAmount,
          hasAmount,
          isNegative,
          original: line,
        });
      }

      // ===== CHECK FOR COLON-DELIMITED HIERARCHICAL FORMAT =====
      const linesWithAmounts = parsedLines.filter(l => l.hasAmount);
      const colonLines = linesWithAmounts.filter(l => l.description.includes(':'));
      const isColonFormat = linesWithAmounts.length > 0 && (colonLines.length / linesWithAmounts.length) > 0.5;

      if (isColonFormat) {
        // Skip header row if present (e.g., "Account,Amount")
        const startIdx = parsedLines[0]?.description.toLowerCase().match(/^(account|description|name)$/) ? 1 : 0;

        for (let i = startIdx; i < parsedLines.length; i++) {
          const { description, amount, finalAmount, hasAmount } = parsedLines[i];
          if (!hasAmount || amount === 0) continue;

          const segments = description.split(':').map(s => s.trim());
          const topLevel = segments[0].toLowerCase();
          const leafDesc = segments[segments.length - 1];
          const sectionPath = segments.slice(0, -1).join(' > ');
          const absAmount = Math.abs(finalAmount);

          // ===== INCOME =====
          if (topLevel.startsWith('income') || topLevel.startsWith('revenue')) {
            if (containsKeyword(description, EXCLUDED_REVENUE_KEYWORDS)) {
              excludedRevenue += absAmount;
            } else if (finalAmount < 0) {
              // Contra-income (refunds, write-offs) - reduce firm revenue
              firmRevenue -= absAmount;
            } else {
              firmRevenue += amount;
              if (isSSRelated(description) || isSSRelated(leafDesc)) {
                ssRevenue += amount;
              }
            }
            continue;
          }

          // ===== OTHER INCOME & EXPENSE =====
          if (topLevel.includes('other income') || topLevel.includes('other expense')) {
            // Skip non-operating items
            continue;
          }

          // ===== EXPENSES (Operating Expenses, COGS, etc.) =====
          if (topLevel.includes('expense') || topLevel.includes('cost of goods') || topLevel.includes('cogs')) {
            // Determine category from path segments and leaf description
            const fullPath = segments.join(' ');
            const pathHasMarketing = segments.some(s => containsKeyword(s, MARKETING_SECTION_KEYWORDS));
            const pathHasLabor = segments.some(s => containsKeyword(s, LABOR_SECTION_KEYWORDS));
            const descMatchesMarketing = containsKeyword(leafDesc, MARKETING_SECTION_KEYWORDS);
            const descMatchesLabor = containsKeyword(leafDesc, LABOR_SECTION_KEYWORDS);
            const descIsNotMarketing = containsKeyword(leafDesc, NOT_MARKETING_KEYWORDS);
            const descIsNotLabor = containsKeyword(leafDesc, NOT_LABOR_KEYWORDS);

            let category = null;
            if (pathHasMarketing || (descMatchesMarketing && !descIsNotMarketing)) {
              if (descIsNotMarketing && !descMatchesMarketing) {
                category = (descMatchesLabor && !descIsNotLabor) ? CATEGORIES.LABOR : CATEGORIES.OTHER;
              } else {
                category = CATEGORIES.MARKETING;
              }
            } else if (pathHasLabor || (descMatchesLabor && !descIsNotLabor)) {
              if (descIsNotLabor && !descMatchesLabor) {
                category = (descMatchesMarketing && !descIsNotMarketing) ? CATEGORIES.MARKETING : CATEGORIES.OTHER;
              } else {
                category = CATEGORIES.LABOR;
              }
            } else {
              category = CATEGORIES.OTHER;
            }

            const item = {
              id: `item-${ssItems.length + uncategorized.length}`,
              description: leafDesc,
              amount: absAmount,
              isNegative: finalAmount < 0,
              category,
              sectionPath,
              originalLine: parsedLines[i].original,
              decision: null,
              partialPercent: null,
              useAutoPercent: false,
            };

            // Check saved rules first
            const descKey = normalizeDescription(leafDesc);
            const savedRule = savedRules[descKey];

            if (savedRule) {
              if (savedRule.decision === 'include') {
                ssItems.push({ ...item, category: savedRule.category || category, autoAppliedRule: true });
              } else if (savedRule.decision === 'partial' && savedRule.partialPercent > 0) {
                ssItems.push({
                  ...item,
                  amount: absAmount * (savedRule.partialPercent / 100),
                  originalAmount: absAmount,
                  appliedPercent: savedRule.partialPercent,
                  category: savedRule.category || category,
                  autoAppliedRule: true,
                });
              }
              // 'exclude' → silently excluded
            } else if (isSSRelated(fullPath)) {
              // Path contains SS keywords → include directly
              ssItems.push(item);
            } else if (isNonSSExpense(fullPath)) {
              // Path contains non-SS practice keywords → auto-exclude
            } else {
              // No SS signal → uncategorized, user decides
              uncategorized.push(item);
            }
          }
        }
      } else {
      // ===== EXISTING SECOND PASS (section-state-machine) =====

      // Pre-scan: identify parent-with-amount lines by simulating stack nesting.
      // A line is a "parent with amount" if it has an amount AND a matching
      // "Total for X" closes it later (e.g., "Admin,$752K" ... "Total for Admin").
      const parentWithAmountLines = new Set();
      const preScanStack = [];

      for (let i = 0; i < parsedLines.length; i++) {
        const { description, hasAmount } = parsedLines[i];
        if (!description) continue;
        const lowerDesc = description.toLowerCase().trim();
        if (lowerDesc.startsWith('total')) {
          const totalFor = getTotalForSection(description);
          if (totalFor) {
            const closingName = totalFor.trim().toLowerCase();
            for (let j = preScanStack.length - 1; j >= 0; j--) {
              if (preScanStack[j].name === closingName) {
                if (preScanStack[j].hasAmount) {
                  parentWithAmountLines.add(preScanStack[j].lineIndex);
                }
                preScanStack.length = j;
                break;
              }
            }
          }
          continue;
        }
        // Push both headers (no amount) and potential parents (with amount)
        preScanStack.push({ name: lowerDesc, lineIndex: i, hasAmount });
      }

      // Second pass: analyze and categorize
      for (let i = 0; i < parsedLines.length; i++) {
        const { description, amount, finalAmount, hasAmount, isNegative } = parsedLines[i];
        const lowerDesc = description.toLowerCase();

        if (!description || lowerDesc.includes('cash basis') || lowerDesc === 'profit and loss') {
          continue;
        }

        // ===== MAIN SECTIONS =====
        if (lowerDesc === 'income' || lowerDesc === 'revenue' || lowerDesc === 'income:' || lowerDesc === 'revenue:') {
          inIncomeSection = true;
          inExpenseSection = false;
          sectionStack.length = 0;
          inMarketingParent = false;
          inLaborParent = false;
          inSSSubsection = false;
          inNonSSSubsection = false;
          continue;
        }

        if (lowerDesc === 'expenses' || lowerDesc === 'expense' || lowerDesc === 'expenses:' ||
            lowerDesc === 'operating expenses' || lowerDesc === 'cost of goods sold') {
          inIncomeSection = false;
          inExpenseSection = true;
          sectionStack.length = 0;
          inMarketingParent = false;
          inLaborParent = false;
          inSSSubsection = false;
          inNonSSSubsection = false;
          continue;
        }

        if (lowerDesc === 'other income' || lowerDesc === 'gross profit' ||
            lowerDesc === 'net income' || lowerDesc === 'net operating income') {
          inIncomeSection = false;
          continue;
        }

        // ===== TOTAL FOR X LINES =====
        const totalForSection = getTotalForSection(description);
        if (totalForSection) {
          // Capture total firm revenue (we'll adjust for exclusions later)
          if (lowerDesc === 'total for income' || lowerDesc === 'total income' || lowerDesc === 'total revenue') {
            firmRevenue = amount;
          }

          // Check if this is an excluded revenue total (like ERC)
          if (inIncomeSection && containsKeyword(totalForSection, EXCLUDED_REVENUE_KEYWORDS) && hasAmount && amount > 0) {
            excludedRevenue += amount;
          }

          // Capture SS revenue total
          if (inIncomeSection && isSSRelated(totalForSection) && hasAmount && amount > 0) {
            if (amount > ssRevenue) {
              ssRevenue = amount;
              ssRevenueSource = description;
            }
          }

          // Pop from stack - only close sections that exactly match
          const closingSection = totalForSection.trim().toLowerCase();

          // Find the matching section in the stack (search from end)
          let matchIndex = -1;
          for (let i = sectionStack.length - 1; i >= 0; i--) {
            const sectionLower = sectionStack[i].toLowerCase();

            // Exact match only (case-insensitive)
            if (sectionLower === closingSection) {
              matchIndex = i;
              break;
            }
          }

          // Only pop if we found an exact match
          if (matchIndex >= 0) {
            // Remove this section and everything after it
            sectionStack.length = matchIndex;
            currentPath = sectionStack.join(' > ');
          }
          // If no exact match, this "Total for X" is a subtotal for line items, not a section closer

          // Re-evaluate ALL context based on remaining stack
          inMarketingParent = sectionStack.some(s => containsKeyword(s, MARKETING_SECTION_KEYWORDS));
          inLaborParent = sectionStack.some(s => containsKeyword(s, LABOR_SECTION_KEYWORDS));
          inSSSubsection = sectionStack.some(s => isSSRelated(s));
          inNonSSSubsection = sectionStack.some(s => containsKeyword(s, NON_SS_KEYWORDS));

          // Reset ssSubsectionType if we're no longer in an SS subsection
          if (!inSSSubsection) {
            ssSubsectionType = null;
          }

          continue;
        }

        // ===== INCOME SECTION: Track individual items for exclusion =====
        if (inIncomeSection && hasAmount && amount > 0) {
          // Check if this is an excluded revenue item (like ERC)
          if (containsKeyword(description, EXCLUDED_REVENUE_KEYWORDS)) {
            excludedRevenue += amount;
          }
        }

        // ===== EXPENSE SECTION =====
        if (inExpenseSection) {
          if (lowerDesc.startsWith('total')) continue;

          // Parent category with direct amount (e.g., "Admin $752K" with "Total for Admin" later)
          const isParentWithAmount = parentWithAmountLines.has(i);

          if (isParentWithAmount && hasAmount) {
            // Push to stack for hierarchy
            sectionStack.push(description);
            currentPath = sectionStack.join(' > ');

            // Update SS/non-SS context (affects practice area classification)
            if (isSSRelated(description)) {
              inSSSubsection = true;
              inNonSSSubsection = false;
              if (inMarketingParent) ssSubsectionType = 'marketing';
              else if (inLaborParent) ssSubsectionType = 'labor';
              else ssSubsectionType = 'expense';
            } else if (containsKeyword(description, NON_SS_KEYWORDS)) {
              inNonSSSubsection = true;
              inSSSubsection = false;
            }

            // Only update marketing/labor category if NOT already in a categorized parent
            // (prevents "Marketing" under WAGES from overriding the Labor category)
            if (!inMarketingParent && !inLaborParent) {
              if (containsKeyword(description, MARKETING_SECTION_KEYWORDS)) {
                inMarketingParent = true;
              }
              if (containsKeyword(description, LABOR_SECTION_KEYWORDS)) {
                inLaborParent = true;
              }
            }

            // Fall through to line-item creation below (don't continue)
          }

          // Section headers (no amount)
          if (!hasAmount && description) {
            sectionStack.push(description);
            currentPath = sectionStack.join(' > ');

            // Check if this section or any parent is marketing/labor
            // Use the full stack to determine context (don't reset, accumulate)
            if (containsKeyword(description, MARKETING_SECTION_KEYWORDS)) {
              inMarketingParent = true;
            }
            if (containsKeyword(description, LABOR_SECTION_KEYWORDS)) {
              inLaborParent = true;
            }

            // Check if SS or Non-SS subsection
            if (isSSRelated(description)) {
              inSSSubsection = true;
              inNonSSSubsection = false;
              if (inMarketingParent) {
                ssSubsectionType = 'marketing';
              } else if (inLaborParent) {
                ssSubsectionType = 'labor';
              } else {
                ssSubsectionType = 'expense';
              }
            } else if (containsKeyword(description, NON_SS_KEYWORDS)) {
              inNonSSSubsection = true;
              inSSSubsection = false;
            }
            continue;
          }

          // ===== LINE ITEMS WITH AMOUNTS =====
          if (hasAmount && amount !== 0) {
            const absAmount = Math.abs(finalAmount);

            // Smart categorization with line-item matching + negative guards
            let category = null;
            const descMatchesMarketing = containsKeyword(description, MARKETING_SECTION_KEYWORDS);
            const descMatchesLabor = containsKeyword(description, LABOR_SECTION_KEYWORDS);
            const descIsNotMarketing = containsKeyword(description, NOT_MARKETING_KEYWORDS);
            const descIsNotLabor = containsKeyword(description, NOT_LABOR_KEYWORDS);

            if (inMarketingParent) {
              // In a marketing section — guard against miscategorized items
              if (descIsNotMarketing && !descMatchesMarketing) {
                category = descMatchesLabor && !descIsNotLabor
                  ? CATEGORIES.LABOR : CATEGORIES.OTHER;
              } else {
                category = CATEGORIES.MARKETING;
              }
            } else if (inLaborParent) {
              // In a labor section — guard against miscategorized items
              if (descIsNotLabor && !descMatchesLabor) {
                category = descMatchesMarketing && !descIsNotMarketing
                  ? CATEGORIES.MARKETING : CATEGORIES.OTHER;
              } else {
                category = CATEGORIES.LABOR;
              }
            } else {
              // Not in a categorized section — line-item keyword matching
              if (descMatchesMarketing && !descIsNotMarketing) {
                category = CATEGORIES.MARKETING;
              } else if (descMatchesLabor && !descIsNotLabor) {
                category = CATEGORIES.LABOR;
              } else {
                category = CATEGORIES.OTHER;
              }
            }

            const item = {
              id: `item-${ssItems.length + uncategorized.length}`,
              description,
              amount: absAmount,
              isNegative: finalAmount < 0,
              category,
              sectionPath: currentPath,
              originalLine: parsedLines[i].original,
              // For uncategorized items
              decision: null, // 'include', 'exclude', 'partial'
              partialPercent: null,
              useAutoPercent: false,
            };

            // Check saved user rules FIRST, then fall back to keyword logic
            const descKey = normalizeDescription(description);
            const savedRule = savedRules[descKey];

            if (savedRule) {
              // User has a saved categorization for this item
              if (savedRule.decision === 'include') {
                ssItems.push({
                  ...item,
                  category: savedRule.category || category,
                  autoAppliedRule: true,
                });
              } else if (savedRule.decision === 'partial' && savedRule.partialPercent > 0) {
                const partialAmount = absAmount * (savedRule.partialPercent / 100);
                ssItems.push({
                  ...item,
                  amount: partialAmount,
                  originalAmount: absAmount,
                  appliedPercent: savedRule.partialPercent,
                  category: savedRule.category || category,
                  autoAppliedRule: true,
                });
              }
              // savedRule.decision === 'exclude' → item silently excluded
            } else if (inSSSubsection) {
              // Clearly SS - add directly
              ssItems.push(item);
            } else if (inNonSSSubsection) {
              // Clearly NOT SS - skip (exclude automatically)
            } else if (isSSRelated(description)) {
              // Line-item description contains SS keywords → auto-include
              ssItems.push(item);
            } else if (isNonSSExpense(description)) {
              // Line-item description contains non-SS practice keywords → auto-exclude
            } else {
              // No practice-area signal → uncategorized, user decides
              console.log('[T12 DEBUG] Uncategorized item:', description, '| category:', category, '| path:', currentPath, '| inMktParent:', inMarketingParent);
              uncategorized.push(item);
            }
          }
        }
      }
      } // end else (non-colon format)
      
      // Validation
      if (ssRevenue === 0 && firmRevenue === 0) {
        throw new Error(
          'Could not find revenue information.\n\n' +
          'Please ensure your P&L contains income/revenue sections.'
        );
      }
      
      // Calculate adjusted firm revenue (excluding one-time items like ERC)
      const adjustedFirmRevenue = firmRevenue - excludedRevenue;
      
      // Calculate SS percentage of adjusted firm revenue
      const ssPercent = adjustedFirmRevenue > 0 ? (ssRevenue / adjustedFirmRevenue * 100) : 100;

      // Pure SS firm: all expenses are SS expenses by definition — auto-include everything
      if (ssPercent >= 100 && uncategorized.length > 0) {
        ssItems.push(...uncategorized);
        uncategorized.length = 0;
      }

      setParsedItems(ssItems);
      setCategorizedItems(ssItems);
      setUncategorizedItems(uncategorized);
      setTotalRevenue(ssRevenue);
      setTotalFirmRevenue(adjustedFirmRevenue); // Store adjusted, not raw
      setSsRevenuePercent(ssPercent);
      
      // Excluded revenue items (ERC, grants, etc.) have been removed from firm revenue total
      
      // If there are uncategorized items, go to step 1.5 to resolve them
      // Otherwise skip to step 2
      if (uncategorized.length > 0) {
        setStep(1.5);
      } else if (ssItems.length > 0) {
        setStep(2);
      } else {
        throw new Error(
          'Could not find any Social Security expenses.\n\n' +
          'Please ensure your P&L has sections with SS/SSD/Disability keywords.'
        );
      }
      
    } catch (error) {
      setParseError(error.message || 'Failed to parse the file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  }, [savedRules]);

  // File upload validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = ['.xlsx', '.csv', '.txt'];

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      setParseError('File is too large. Maximum size is 10MB.');
      return false;
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setParseError('Unsupported file type. Please upload an .xlsx, .csv, or .txt file.');
      return false;
    }
    return true;
  };

  // Handle file drop
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file && validateFile(file)) {
      parseFile(file);
    }
  }, [parseFile]);

  // Handle manual text input
  const handleTextSubmit = useCallback((text) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'pl-data.csv');
    parseFile(file);
  }, [parseFile]);

  // Change category for an item
  const changeCategory = useCallback((itemId, newCategory) => {
    setCategorizedItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          saveRule(item.description, 'include', item.appliedPercent || null, newCategory);
          return { ...item, category: newCategory };
        }
        return item;
      })
    );
  }, [saveRule]);

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCategory = (e, category) => {
    e.preventDefault();
    if (draggedItem) {
      changeCategory(draggedItem.id, category);
      setDraggedItem(null);
    }
  };

  // Industry benchmarks for comparison
  const BENCHMARKS = {
    marketing: { target: 15, description: 'Target: 15% of revenue' },
    labor: { target: 50, description: 'Target: 50% of revenue' },
    other: { target: 15, description: 'Target: 15% of revenue' },
    profit: { target: 20, description: 'Target: 20% of revenue' },
  };

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totals = {
      [CATEGORIES.MARKETING]: 0,
      [CATEGORIES.LABOR]: 0,
      [CATEGORIES.OTHER]: 0,
    };
    
    categorizedItems.forEach(item => {
      totals[item.category] += item.amount;
    });
    
    const totalExpenses = totals[CATEGORIES.MARKETING] + totals[CATEGORIES.LABOR] + totals[CATEGORIES.OTHER];
    const profit = totalRevenue - totalExpenses;
    
    return {
      revenue: totalRevenue,
      marketing: totals[CATEGORIES.MARKETING],
      labor: totals[CATEGORIES.LABOR],
      other: totals[CATEGORIES.OTHER],
      totalExpenses,
      profit,
      marketingPct: totalRevenue > 0 ? (totals[CATEGORIES.MARKETING] / totalRevenue * 100) : 0,
      laborPct: totalRevenue > 0 ? (totals[CATEGORIES.LABOR] / totalRevenue * 100) : 0,
      otherPct: totalRevenue > 0 ? (totals[CATEGORIES.OTHER] / totalRevenue * 100) : 0,
      profitPct: totalRevenue > 0 ? (profit / totalRevenue * 100) : 0,
    };
  }, [categorizedItems, totalRevenue]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups = {
      [CATEGORIES.MARKETING]: [],
      [CATEGORIES.LABOR]: [],
      [CATEGORIES.OTHER]: [],
    };
    
    categorizedItems.forEach(item => {
      groups[item.category].push(item);
    });
    
    // Sort each group by amount descending
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.amount - a.amount);
    });
    
    return groups;
  }, [categorizedItems]);

  // Clear all data
  const clearAllData = useCallback(() => {
    setPlData(null);
    setParsedItems([]);
    setCategorizedItems([]);
    setUncategorizedItems([]);
    setTotalRevenue(0);
    setTotalFirmRevenue(0);
    setSsRevenuePercent(0);
    setSsEmployeePercent(null);
    setParseError(null);
    setStep(0);
    setDataConfirmed(false);
    setTextInput('');
    setShowTextInput(false);
  }, []);

  // Fire-and-forget: insert anonymized T12 snapshot if user opted in
  const maybeInsertT12Snapshot = async () => {
    if (!user || user.id === 'demo-user-id') return;
    try {
      const { data: settings } = await supabase
        .from('firm_settings')
        .select('contribute_benchmarks')
        .eq('user_id', user.id)
        .single();

      if (!settings?.contribute_benchmarks) return;

      await supabase.from('t12_snapshots').insert({
        snapshot_date: new Date().toISOString(),
        marketing_pct: summary.marketingPct,
        labor_pct: summary.laborPct,
        other_pct: summary.otherPct,
        profit_pct: summary.profitPct,
        ss_revenue_pct: ssRevenuePercent,
      });
    } catch (err) {
      console.warn('T12 snapshot insert failed (non-critical):', err?.message);
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(v || 0);

  const formatPercent = (v) => `${v.toFixed(1)}%`;

  // ============================================
  // STEP 0: WELCOME & SECURITY
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
            T12 P&L Analysis
          </span>
        </div>
      </div>
      
      {/* Critical Security Notice */}
      <div style={{ 
        padding: '20px', 
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>🔒</div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f87171', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Critical Data Security Notice
            </h3>
            <ul style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.8', margin: 0, paddingLeft: '16px' }}>
              <li><strong>100% Local Processing</strong> — Your P&L data is processed entirely in your browser</li>
              <li><strong>Zero Server Transmission</strong> — No financial data is ever sent to any server</li>
              <li><strong>No Training Use</strong> — Your data is NOT used to train any AI models</li>
              <li><strong>Immediate Deletion</strong> — All data is permanently erased when you close this page</li>
              <li><strong>No Raw Data Storage</strong> — Your P&L file data is never saved. Only your categorization preferences (line item names and how you classified them) are stored to speed up future analyses.</li>
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
          What This Tool Does
        </h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
          The T12 P&L Analysis extracts <strong style={{ color: '#10b981' }}>Social Security practice data only</strong> from your 
          trailing 12-month P&L and categorizes expenses into three buckets:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>Marketing</div>
            <div style={{ color: '#94a3b8' }}>SS case acquisition costs</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ color: '#6366f1', fontWeight: '600', marginBottom: '4px' }}>Labor</div>
            <div style={{ color: '#94a3b8' }}>SS staff wages & benefits</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div style={{ color: '#8b5cf6', fontWeight: '600', marginBottom: '4px' }}>Other</div>
            <div style={{ color: '#94a3b8' }}>SS operating expenses</div>
          </div>
        </div>
      </div>
      
      {/* QuickBooks Export Instructions */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        marginBottom: '24px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: '700', marginBottom: '8px' }}>
              How to Export from QuickBooks
            </div>
            <ol style={{ color: '#fcd34d', margin: '0', paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>In QuickBooks, go to <strong>Reports → Profit and Loss</strong></li>
              <li>Set the date range to your <strong>trailing 12 months</strong></li>
              <li>Click <strong>Export</strong> (or the Excel icon)</li>
              <li>Select <strong>"Export to Excel"</strong> — this preserves your chart of accounts hierarchy (headings and subheadings)</li>
              <li>Save the .xlsx or .csv file to your computer</li>
            </ol>
            <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', color: '#fca5a5', fontSize: '11px' }}>
              <strong>⚠️ Important:</strong> Do NOT copy/paste from QuickBooks — this loses the hierarchy structure. You must use the Export function.
            </div>
          </div>
        </div>
      </div>
      
      {/* Keyword Detection Info */}
      <div style={{
        padding: '16px',
        background: 'rgba(99, 102, 241, 0.08)',
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        marginBottom: '24px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <div>
            <div style={{ color: '#6366f1', fontWeight: '700', marginBottom: '6px' }}>
              How the Tool Categorizes Expenses
            </div>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '8px' }}>
              The tool reads your P&L headings and subheadings to automatically categorize expenses:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
              <div>
                <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>✓ Auto-INCLUDED (SS-related):</div>
                <div style={{ color: '#94a3b8', lineHeight: '1.5' }}>
                  Social Security, SSD, SSDI, SSI, Disability, 406A/B, EAJA, Appeals Council, etc.
                </div>
              </div>
              <div>
                <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>✕ Auto-EXCLUDED (Other practice areas):</div>
                <div style={{ color: '#94a3b8', lineHeight: '1.5' }}>
                  Personal Injury, VA/Veterans, Workers Comp, Med Mal, Criminal, Family Law, etc.
                </div>
              </div>
            </div>
            <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '11px' }}>
              Items under headings that aren't clearly SS or another practice area will be presented for your review.
            </div>
          </div>
        </div>
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
            I understand that my P&L data is processed locally, is <strong style={{ color: '#f87171' }}>never transmitted to any server</strong>, 
            is <strong style={{ color: '#f87171' }}>not used to train any AI models</strong>, and will be 
            <strong style={{ color: '#f87171' }}> permanently deleted</strong> when I close this page.
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
        Continue to Upload →
      </button>

      {user && Object.keys(savedRules).length > 0 && (
        <button
          onClick={() => setShowRulesModal(true)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            marginTop: '12px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#a5b4fc',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Manage Saved Rules ({Object.keys(savedRules).length})
        </button>
      )}
    </div>
  );

  // ============================================
  // STEP 1: UPLOAD P&L
  // ============================================
  const renderStep1 = () => {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            STEP 1
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>
            Upload Your QuickBooks P&L Export
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
            Upload the Excel (.xlsx) or CSV file exported from QuickBooks.
            <br />
            <span style={{ color: '#10b981' }}>The export preserves your chart of accounts hierarchy for accurate categorization.</span>
          </p>
        </div>
        
        {/* Security Reminder */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '20px',
          fontSize: '11px',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          🔒 Your data stays in your browser. Nothing is uploaded to any server.
        </div>
        
        {/* File Drop Zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            padding: '40px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
            borderRadius: '16px',
            border: '2px dashed rgba(99, 102, 241, 0.4)',
            textAlign: 'center',
            marginBottom: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls"
            onChange={handleFileDrop}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}>
            Drop your P&L file here
          </div>
          <div style={{ fontSize: '12px', color: '#6366f1' }}>
            or click to browse
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
            Accepts CSV, TSV, or TXT files
          </div>
        </div>
        
        {/* Or Paste Text */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showTextInput ? 'Hide text input' : 'Or paste P&L data as text'}
          </button>
        </div>
        
        {showTextInput && (
          <div style={{ marginBottom: '20px' }}>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your P&L data here (CSV format)..."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(15, 15, 25, 0.8)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            <button
              onClick={() => handleTextSubmit(textInput)}
              disabled={!textInput.trim()}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: textInput.trim() 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' 
                  : 'rgba(99, 102, 241, 0.2)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: textInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Process Text Data
            </button>
          </div>
        )}
        
        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6366f1' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Processing your P&L data...
          </div>
        )}
        
        {parseError && (
          <div style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '20px',
          }}>
            <strong>Error:</strong> {parseError}
          </div>
        )}
        
        {/* Format Help */}
        <div style={{
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '11px',
          color: '#94a3b8',
        }}>
          <strong style={{ color: '#6366f1' }}>Accepted File Types:</strong>
          <div style={{ marginTop: '6px', marginBottom: '10px' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', marginRight: '6px' }}>.xlsx</span>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', marginRight: '6px' }}>.csv</span>
            <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', padding: '2px 8px', borderRadius: '4px' }}>.txt</span>
          </div>
          <strong style={{ color: '#6366f1' }}>The tool will automatically:</strong>
          <div style={{ marginTop: '6px', lineHeight: '1.7' }}>
            <div><span style={{ color: '#10b981' }}>✓</span> Include expenses under SS/SSD/Disability headings</div>
            <div><span style={{ color: '#ef4444' }}>✕</span> Exclude expenses under PI, VA, Workers Comp, etc.</div>
            <div><span style={{ color: '#f59e0b' }}>?</span> Ask you about shared/overhead expenses</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '24px' }}>
          <button
            onClick={() => setStep(0)}
            style={{
              padding: '10px 24px', borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.3)', 
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // STEP 1.5: RESOLVE UNCATEGORIZED ITEMS
  // ============================================
  
  // Handle decision for an uncategorized item
  const handleItemDecision = useCallback((itemId, decision, partialPercent = null, useAuto = false) => {
    setUncategorizedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const autoPercent = item.category === 'marketing'
          ? (ssAdPercent ?? ssEmployeePercent ?? ssRevenuePercent)
          : (ssEmployeePercent ?? ssRevenuePercent);
        const effectivePercent = decision === 'partial'
          ? (useAuto ? autoPercent : partialPercent)
          : null;

        // Save rule for future uploads
        saveRule(item.description, decision, effectivePercent, item.category);

        return {
          ...item,
          decision,
          partialPercent: effectivePercent,
          useAutoPercent: useAuto,
        };
      }
      return item;
    }));
  }, [ssAdPercent, ssEmployeePercent, ssRevenuePercent, saveRule]);
  
  // Handle bulk decision for all items in a section
  const handleSectionDecision = useCallback((sectionPath, decision, partialPercent = null, useAuto = false) => {
    setUncategorizedItems(prev => prev.map(item => {
      if (item.sectionPath === sectionPath) {
        const autoPercent = item.category === 'marketing'
          ? (ssAdPercent ?? ssEmployeePercent ?? ssRevenuePercent)
          : (ssEmployeePercent ?? ssRevenuePercent);
        const effectivePercent = decision === 'partial'
          ? (useAuto ? autoPercent : partialPercent)
          : null;

        // Save rule for each item in the section
        saveRule(item.description, decision, effectivePercent, item.category);

        return {
          ...item,
          decision,
          partialPercent: effectivePercent,
          useAutoPercent: useAuto,
        };
      }
      return item;
    }));
  }, [ssAdPercent, ssEmployeePercent, ssRevenuePercent, saveRule]);
  
  // Group uncategorized items by section path for display
  const groupedUncategorizedItems = useMemo(() => {
    const groups = {};
    uncategorizedItems.forEach(item => {
      const path = item.sectionPath || '(No Section)';
      if (!groups[path]) {
        groups[path] = {
          path,
          items: [],
          totalAmount: 0,
        };
      }
      groups[path].items.push(item);
      groups[path].totalAmount += item.amount;
    });
    
    // Sort groups by total amount descending
    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [uncategorizedItems]);
  
  // Apply all decisions and move to step 2
  const applyUncategorizedDecisions = useCallback(() => {
    const newItems = [...categorizedItems];
    
    uncategorizedItems.forEach(item => {
      if (item.decision === 'include') {
        // Include 100% of this expense
        newItems.push({
          ...item,
          id: `item-${newItems.length}`,
        });
      } else if (item.decision === 'partial' && item.partialPercent > 0) {
        // Include partial percentage
        const partialAmount = item.amount * (item.partialPercent / 100);
        newItems.push({
          ...item,
          id: `item-${newItems.length}`,
          amount: partialAmount,
          originalAmount: item.amount,
          appliedPercent: item.partialPercent,
        });
      }
      // 'exclude' items are simply not added
    });
    
    setCategorizedItems(newItems);
    setStep(2);
  }, [categorizedItems, uncategorizedItems]);
  
  // Check if all uncategorized items have decisions
  const allDecisionsMade = uncategorizedItems.every(item => item.decision !== null);

  // Count items auto-applied from saved rules
  const autoAppliedCount = useMemo(() => {
    return categorizedItems.filter(item => item.autoAppliedRule).length;
  }, [categorizedItems]);
  
  const renderStep1_5 = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          STEP 1.5
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>
          Resolve Shared/Overhead Expenses
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5', flex: 1 }}>
            These expenses couldn't be automatically identified as Social Security-specific.
            Please indicate how to handle each one.
          </p>
          {user && Object.keys(savedRules).length > 0 && (
            <button
              onClick={() => setShowRulesModal(true)}
              style={{
                padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap',
                border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.1)',
                color: '#a5b4fc', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              Saved Rules ({Object.keys(savedRules).length})
            </button>
          )}
        </div>
      </div>

      {/* Auto-applied rules banner */}
      {autoAppliedCount > 0 && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#10b981',
        }}>
          {autoAppliedCount} item(s) were automatically categorized based on your previous decisions.
        </div>
      )}

      {/* SS Revenue Context */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>SS Revenue</div>
          <div style={{ fontSize: '18px', color: '#f1f5f9', fontWeight: '700' }}>{formatCurrency(totalRevenue)}</div>
        </div>
        {totalFirmRevenue > 0 && (
          <>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Total Firm Revenue</div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '700' }}>{formatCurrency(totalFirmRevenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>SS % of Firm</div>
              <div style={{ fontSize: '18px', color: '#6366f1', fontWeight: '700' }}>{ssRevenuePercent.toFixed(1)}%</div>
            </div>
          </>
        )}
        {ssEmployeePercent != null && (
          <div>
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>SS Staff %</div>
            <div style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '700' }}>{ssEmployeePercent.toFixed(1)}%</div>
          </div>
        )}
      </div>
      
      {/* SS Employee % — only for mixed-practice firms */}
      {ssRevenuePercent < 100 && (
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600', marginBottom: '8px' }}>
            Mixed-Practice Firm Detected
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            Your firm has revenue outside of Social Security. What percentage of your staff is dedicated to SS work?
            This will be used to allocate shared expenses.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 60"
              value={ssEmployeePercent ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSsEmployeePercent(val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0)));
              }}
              style={{
                width: '80px', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(15, 15, 25, 0.8)',
                color: '#f1f5f9', fontSize: '14px', fontWeight: '600', textAlign: 'center',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>%</span>
            <button
              onClick={() => {
                if (ssEmployeePercent != null && ssEmployeePercent > 0) {
                  setUncategorizedItems(prev => prev.map(item => {
                    const pct = (item.category === 'marketing' && ssAdPercent != null && ssAdPercent > 0)
                      ? ssAdPercent : ssEmployeePercent;
                    saveRule(item.description, 'partial', pct, item.category);
                    return {
                      ...item,
                      decision: 'partial',
                      partialPercent: pct,
                      useAutoPercent: true,
                    };
                  }));
                }
              }}
              disabled={ssEmployeePercent == null || ssEmployeePercent <= 0}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: (ssEmployeePercent != null && ssEmployeePercent > 0)
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'rgba(245, 158, 11, 0.2)',
                color: 'white', fontSize: '12px', fontWeight: '600',
                cursor: (ssEmployeePercent != null && ssEmployeePercent > 0) ? 'pointer' : 'not-allowed',
              }}
            >
              Apply to All Items
            </button>
          </div>
        </div>
      )}

      {/* Advertising Budget % - shown when there are uncategorized marketing items */}
      {ssRevenuePercent < 100 && uncategorizedItems.some(item => item.category === 'marketing') && (
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '600', marginBottom: '8px' }}>
            Advertising Budget Allocation
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            What percentage of your firm's advertising budget is dedicated to Social Security?
            This will be applied to shared advertising expenses (Brand, general marketing, etc.).
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 70"
              value={ssAdPercent ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSsAdPercent(val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0)));
              }}
              style={{
                width: '80px', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(15, 15, 25, 0.8)',
                color: '#f1f5f9', fontSize: '14px', fontWeight: '600', textAlign: 'center',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>%</span>
            <button
              onClick={() => {
                if (ssAdPercent != null && ssAdPercent > 0) {
                  setUncategorizedItems(prev => prev.map(item => {
                    if (item.category === 'marketing') {
                      saveRule(item.description, 'partial', ssAdPercent, item.category);
                      return {
                        ...item,
                        decision: 'partial',
                        partialPercent: ssAdPercent,
                        useAutoPercent: true,
                      };
                    }
                    return item;
                  }));
                }
              }}
              disabled={ssAdPercent == null || ssAdPercent <= 0}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: (ssAdPercent != null && ssAdPercent > 0)
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'rgba(59, 130, 246, 0.2)',
                color: 'white', fontSize: '12px', fontWeight: '600',
                cursor: (ssAdPercent != null && ssAdPercent > 0) ? 'pointer' : 'not-allowed',
              }}
            >
              Apply to Ad Items
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '10px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        marginBottom: '20px',
        fontSize: '11px',
        color: '#94a3b8',
      }}>
        <strong style={{ color: '#6366f1' }}>For each expense, choose:</strong>
        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div><span style={{ color: '#10b981' }}>Include</span> — 100% is SS-related</div>
          <div><span style={{ color: '#ef4444' }}>Exclude</span> — Not SS-related</div>
          <div><span style={{ color: '#f59e0b' }}>Partial</span> — Allocate a % to SS</div>
        </div>
      </div>
      
      {/* Uncategorized Items - Grouped by Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '13px' }}>
            {groupedUncategorizedItems.length} Sections • {uncategorizedItems.length} Items Need Your Decision
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            {uncategorizedItems.filter(i => i.decision).length} of {uncategorizedItems.length} resolved
          </span>
        </div>
        
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {groupedUncategorizedItems.map((group) => {
            const allIncluded = group.items.every(i => i.decision === 'include');
            const allExcluded = group.items.every(i => i.decision === 'exclude');
            const allPartialAuto = group.items.every(i => i.decision === 'partial' && i.useAutoPercent);
            const resolvedCount = group.items.filter(i => i.decision).length;
            
            return (
              <div key={group.path} style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.15)' }}>
                {/* Section Header with Bulk Actions */}
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ color: '#a5b4fc', fontSize: '12px', fontWeight: '600' }}>
                      {group.path || '(Top Level)'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                      {group.items.length} items • {formatCurrency(group.totalAmount)} total
                      {resolvedCount > 0 && resolvedCount < group.items.length && (
                        <span style={{ color: '#f59e0b' }}> • {resolvedCount} resolved</span>
                      )}
                      {resolvedCount === group.items.length && (
                        <span style={{ color: '#10b981' }}> • All resolved</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Bulk Action Buttons */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', marginRight: '4px' }}>Apply to all:</span>
                    <button
                      onClick={() => handleSectionDecision(group.path === '(No Section)' ? '' : group.path, 'include')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: allIncluded ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
                        background: allIncluded ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: '#10b981',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Include All
                    </button>
                    <button
                      onClick={() => handleSectionDecision(group.path === '(No Section)' ? '' : group.path, 'exclude')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: allExcluded ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                        background: allExcluded ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: '#ef4444',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Exclude All
                    </button>
                    <button
                      onClick={() => handleSectionDecision(group.path === '(No Section)' ? '' : group.path, 'partial', ssEmployeePercent ?? ssRevenuePercent, true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: allPartialAuto ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.3)',
                        background: allPartialAuto ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: '#f59e0b',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Auto % All
                    </button>
                  </div>
                </div>
                
                {/* Items in this section */}
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 16px 10px 28px',
                      borderBottom: '1px solid rgba(99, 102, 241, 0.05)',
                      background: item.decision ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ color: '#e2e8f0', fontSize: '12px' }}>
                        {item.description}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                        <div style={{ color: '#f1f5f9', fontSize: '12px', fontWeight: '500' }}>
                          {formatCurrency(item.amount)}
                        </div>
                        {item.decision === 'partial' && item.partialPercent && (
                          <div style={{ color: '#f59e0b', fontSize: '9px' }}>
                            {item.partialPercent.toFixed(1)}% → {formatCurrency(item.amount * item.partialPercent / 100)}
                          </div>
                        )}
                      </div>
                      
                      {/* Individual Item Buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleItemDecision(item.id, 'include')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: item.decision === 'include' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
                            background: item.decision === 'include' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: '#10b981',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleItemDecision(item.id, 'exclude')}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: item.decision === 'exclude' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                            background: item.decision === 'exclude' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            color: '#ef4444',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => handleItemDecision(item.id, 'partial', ssEmployeePercent ?? ssRevenuePercent, true)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: (item.decision === 'partial' && item.useAutoPercent) ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.3)',
                            background: (item.decision === 'partial' && item.useAutoPercent) ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                            color: '#f59e0b',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          %
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.3)', 
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={applyUncategorizedDecisions}
          disabled={!allDecisionsMade}
          style={{
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            background: allDecisionsMade 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : 'rgba(99, 102, 241, 0.2)',
            color: 'white', fontSize: '14px', fontWeight: '600', 
            cursor: allDecisionsMade ? 'pointer' : 'not-allowed',
            boxShadow: allDecisionsMade ? '0 0 25px rgba(16, 185, 129, 0.3)' : 'none',
          }}
        >
          Continue to Review →
        </button>
      </div>
    </div>
  );

  // ============================================
  // STEP 2: CATEGORIZE EXPENSES
  // ============================================
  const renderStep2 = () => (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          STEP 2
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>
          Review & Adjust Categories
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5', flex: 1 }}>
            We've auto-categorized your expenses. Drag items between categories or use the dropdown to adjust.
          </p>
          {user && Object.keys(savedRules).length > 0 && (
            <button
              onClick={() => setShowRulesModal(true)}
              style={{
                padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap',
                border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.1)',
                color: '#a5b4fc', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              Saved Rules ({Object.keys(savedRules).length})
            </button>
          )}
        </div>
      </div>

      {/* Revenue Input */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '2px' }}>
            SSD Fees Revenue (T12)
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Extracted from P&L • Adjust if needed
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10b981', fontSize: '18px' }}>$</span>
          <input
            type="number"
            value={totalRevenue}
            onChange={(e) => setTotalRevenue(parseFloat(e.target.value) || 0)}
            style={{
              width: '150px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(15, 15, 25, 0.8)',
              color: '#10b981',
              fontSize: '18px',
              fontWeight: '700',
              textAlign: 'right',
            }}
          />
        </div>
      </div>
      
      {/* Category Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
          <div
            key={category}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnCategory(e, category)}
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
              borderRadius: '16px',
              border: `1px solid ${config.color}40`,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              background: `${config.color}20`,
              borderBottom: `1px solid ${config.color}30`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: config.color, fontWeight: '700', fontSize: '14px' }}>
                    {config.label}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px' }}>
                    {config.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>
                    {formatCurrency(summary[category])}
                  </div>
                  <div style={{ color: config.color, fontSize: '11px' }}>
                    {formatPercent(summary[`${category}Pct`])} of revenue
                  </div>
                </div>
              </div>
            </div>
            
            {/* Items */}
            <div style={{ padding: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {groupedItems[category].length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#64748b', 
                  fontSize: '11px',
                  border: '1px dashed rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                }}>
                  Drop items here
                </div>
              ) : (
                groupedItems[category].map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(99, 102, 241, 0.05)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'grab',
                      border: '1px solid rgba(99, 102, 241, 0.1)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#e2e8f0',
                          wordBreak: 'break-word',
                        }}>
                          {item.description}
                        </div>
                        {item.sectionPath && (
                          <div style={{
                            fontSize: '9px',
                            color: '#64748b',
                            marginTop: '2px',
                          }}>
                            {item.sectionPath}
                          </div>
                        )}
                        {item.autoAppliedRule && (
                          <div style={{
                            fontSize: '9px',
                            color: '#10b981',
                            marginTop: '2px',
                          }}>
                            Auto-applied from saved rule
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: item.isNegative ? '#f87171' : config.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {item.isNegative ? '-' : ''}{formatCurrency(item.amount)}
                      </div>
                    </div>
                    <select
                      value={item.category}
                      onChange={(e) => changeCategory(item.id, e.target.value)}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        background: 'rgba(15, 15, 25, 0.8)',
                        color: '#94a3b8',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value={CATEGORIES.MARKETING}>Marketing</option>
                      <option value={CATEGORIES.LABOR}>Labor</option>
                      <option value={CATEGORIES.OTHER}>Other</option>
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Bar */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '12px' }}>Total Expenses: </span>
            <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>{formatCurrency(summary.totalExpenses)}</span>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '12px' }}>Profit: </span>
            <span style={{ color: summary.profit >= 0 ? '#10b981' : '#f87171', fontSize: '14px', fontWeight: '600' }}>
              {formatCurrency(summary.profit)} ({formatPercent(summary.profitPct)})
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            {categorizedItems.length} expense items categorized
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.3)', 
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => {
            setStep(3);
            maybeInsertT12Snapshot();
          }}
          style={{
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
          }}
        >
          Generate T12 Report →
        </button>
      </div>
    </div>
  );

  // ============================================
  // STEP 3: REPORT
  // ============================================

  // Memoize chart data to prevent unnecessary Recharts re-renders
  const pieData = useMemo(() => [
    { name: 'Marketing', value: summary.marketingPct, color: '#3b82f6' },
    { name: 'Labor', value: summary.laborPct, color: '#6366f1' },
    { name: 'Other', value: summary.otherPct, color: '#8b5cf6' },
    { name: 'Profit', value: Math.max(0, summary.profitPct), color: '#10b981' },
  ].filter(d => d.value > 0), [summary.marketingPct, summary.laborPct, summary.otherPct, summary.profitPct]);

  const barData = useMemo(() => [
    { name: 'Marketing', amount: summary.marketing, pct: summary.marketingPct, color: '#3b82f6' },
    { name: 'Labor', amount: summary.labor, pct: summary.laborPct, color: '#6366f1' },
    { name: 'Other', amount: summary.other, pct: summary.otherPct, color: '#8b5cf6' },
    { name: 'Profit', amount: summary.profit, pct: summary.profitPct, color: '#10b981' },
  ], [summary.marketing, summary.marketingPct, summary.labor, summary.laborPct, summary.other, summary.otherPct, summary.profit, summary.profitPct]);

  const barDataFiltered = useMemo(() => barData.filter(d => d.name !== 'Profit'), [barData]);

  const t12ExcelData = useMemo(() => barData.map(row => ({
    Category: row.name,
    Amount: Math.round(row.amount),
    '% of Revenue': `${row.pct.toFixed(1)}%`,
    Benchmark: BENCHMARKS[row.name.toLowerCase()]?.description || '',
  })), [barData]);

  const renderStep3 = () => {
    return (
      <div ref={contentRef} style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BenefitArcLogoSmall size={36} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  Social Security Practice Analysis
                </h1>
                <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                  T12 P&L Analysis
                </span>
              </div>
              <p style={{ color: '#64748b', margin: 0, fontSize: '11px' }}>
                Trailing 12-Month • SSD Revenue & Expenses Only
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ScenarioSelector
              scenarios={scenarioHook.scenarios}
              activeId={scenarioHook.activeId}
              loading={scenarioHook.loading}
              onSave={(name, data) => scenarioHook.saveScenario(name, data)}
              onLoad={handleLoadScenario}
              onDelete={scenarioHook.deleteScenario}
              getDataToSave={getDataToSave}
            />
            <ExportToolbar
              contentRef={contentRef}
              pdfFilename="BenefitArc-T12-Analysis"
              excelData={t12ExcelData}
              excelSheetName="T12 P&L"
              excelFilename="BenefitArc-T12-PL-Data"
            />
            <button
              onClick={clearAllData}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444', fontSize: '11px', cursor: 'pointer',
              }}
            >
              🗑️ Clear All Data
            </button>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1', fontSize: '11px', cursor: 'pointer',
              }}
            >
              ← Edit Categories
            </button>
          </div>
        </div>

        {/* Main Revenue Card */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          marginBottom: '20px',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(16, 185, 129, 0.15)',
        }}>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            SSD Fees Revenue (T12)
          </div>
          <div style={{ fontSize: '42px', fontWeight: '700', color: '#f1f5f9' }}>
            {formatCurrency(summary.revenue)}
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#6366f1', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', color: '#6366f1', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', color: '#6366f1', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% of Revenue</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', color: '#6366f1', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Benchmark</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#6366f1', fontWeight: '600', fontSize: '12px', width: '150px' }}></th>
              </tr>
            </thead>
            <tbody>
              {barData.map((row, i) => {
                const benchmarkKey = row.name.toLowerCase();
                const benchmark = BENCHMARKS[benchmarkKey];
                
                // For expenses (marketing, labor, other): below target is good
                // For profit: above target is good
                const isExpense = benchmarkKey !== 'profit';
                const diff = benchmark ? row.pct - benchmark.target : 0;
                const status = isExpense 
                  ? (diff <= 0 ? 'good' : diff <= 5 ? 'warning' : 'bad')
                  : (diff >= 0 ? 'good' : diff >= -5 ? 'warning' : 'bad');
                
                const statusColor = status === 'good' ? '#10b981' : status === 'warning' ? '#fbbf24' : '#f87171';
                const statusIcon = status === 'good' ? '✓' : status === 'warning' ? '•' : '⚠';
                const statusText = isExpense
                  ? (status === 'good' ? 'At or below target' : status === 'warning' ? 'Slightly over' : 'Over target')
                  : (status === 'good' ? 'At or above target' : status === 'warning' ? 'Slightly under' : 'Below target');
                
                return (
                  <tr key={row.name} style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: row.color }} />
                        <span style={{ color: '#f1f5f9', fontWeight: '500', fontSize: '14px' }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: row.name === 'Profit' && row.amount < 0 ? '#f87171' : '#f1f5f9', fontWeight: '600', fontSize: '15px' }}>
                      {formatCurrency(row.amount)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: `${row.color}20`,
                        border: `1px solid ${row.color}40`,
                        color: row.color,
                        fontWeight: '600',
                        fontSize: '13px',
                      }}>
                        {formatPercent(row.pct)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {benchmark && (
                        <div>
                          <span style={{ 
                            fontSize: '13px', 
                            color: '#94a3b8',
                            fontWeight: '600',
                          }}>
                            {benchmark.target}%
                          </span>
                          <div style={{ fontSize: '10px', color: statusColor, marginTop: '2px', fontWeight: '500' }}>
                            {statusIcon} {statusText}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{
                        height: '8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        {/* Target marker */}
                        {benchmark && (
                          <div style={{
                            position: 'absolute',
                            left: `${Math.min(100, benchmark.target)}%`,
                            top: '-2px',
                            bottom: '-2px',
                            width: '2px',
                            background: '#94a3b8',
                            zIndex: 2,
                          }} />
                        )}
                        <div style={{
                          height: '100%',
                          width: `${Math.max(0, Math.min(100, row.pct))}%`,
                          background: statusColor,
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Benchmark Note */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          marginBottom: '20px',
          fontSize: '10px',
          color: '#94a3b8',
        }}>
          <strong style={{ color: '#6366f1' }}>Targets:</strong> Marketing ≤15% | Labor ≤50% | Other ≤15% | Profit ≥20%. 
          The progress bars show your actual percentage with a marker at the target. Green indicates you're meeting the target.
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Pie Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revenue Distribution
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value) => [`${value.toFixed(1)}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {pieData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }} />
                  <span style={{ color: '#94a3b8' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(15, 15, 25, 0.7) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Expense Comparison
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barDataFiltered} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#6366f1" fontSize={10} tickLine={false} />
                <YAxis stroke="#6366f1" fontSize={9} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f0f19', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {barDataFiltered.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security Footer */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          fontSize: '10px',
          color: '#fca5a5',
          textAlign: 'center',
        }}>
          🔒 <strong>Security Reminder:</strong> Your P&L data was processed entirely in your browser. 
          No data was transmitted to any server or used for AI training. 
          All data will be permanently deleted when you close this page.
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
      
      {/* Gradient orbs */}
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
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 1.5 && renderStep1_5()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Rules Management Modal */}
      {showRulesModal && (() => {
        const allRules = Object.entries(savedRules)
          .map(([key, rule]) => ({ key, ...rule }))
          .filter(rule => {
            if (!rulesSearchTerm) return true;
            return rule.descriptionDisplay.toLowerCase().includes(rulesSearchTerm.toLowerCase());
          })
          .sort((a, b) => a.descriptionDisplay.localeCompare(b.descriptionDisplay));

        return (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => { setShowRulesModal(false); setRulesSearchTerm(''); }}
          >
            <div
              style={{
                width: '90%', maxWidth: '800px', maxHeight: '80vh',
                background: 'linear-gradient(135deg, #0f0f19 0%, #141423 100%)',
                borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.3)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
                    Saved Categorization Rules
                  </h2>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>
                    {Object.keys(savedRules).length} rule(s) saved — these are applied automatically on future uploads
                  </p>
                </div>
                <button
                  onClick={() => { setShowRulesModal(false); setRulesSearchTerm(''); }}
                  style={{
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer',
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  X
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '12px 24px' }}>
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={rulesSearchTerm}
                  onChange={e => setRulesSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(15,15,25,0.8)',
                    color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Rules list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 20px' }}>
                {allRules.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    {rulesSearchTerm
                      ? 'No rules match your search.'
                      : 'No saved rules yet. Rules are saved automatically as you categorize items.'}
                  </div>
                ) : (
                  allRules.map(rule => (
                    <div key={rule.key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid rgba(99,102,241,0.1)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rule.descriptionDisplay}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                            background: rule.decision === 'include' ? 'rgba(16,185,129,0.2)' : rule.decision === 'exclude' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                            color: rule.decision === 'include' ? '#10b981' : rule.decision === 'exclude' ? '#ef4444' : '#f59e0b',
                          }}>
                            {rule.decision === 'include' ? 'Include' : rule.decision === 'exclude' ? 'Exclude' : `Partial (${rule.partialPercent}%)`}
                          </span>
                          {rule.category && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                              background: rule.category === 'marketing' ? 'rgba(59,130,246,0.2)' : rule.category === 'labor' ? 'rgba(99,102,241,0.2)' : 'rgba(139,92,246,0.2)',
                              color: rule.category === 'marketing' ? '#3b82f6' : rule.category === 'labor' ? '#6366f1' : '#8b5cf6',
                            }}>
                              {rule.category.charAt(0).toUpperCase() + rule.category.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteRule(rule.key)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', marginLeft: '12px',
                          border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                          color: '#ef4444', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Save error toast */}
              {rulesSaveError && (
                <div style={{
                  padding: '10px 24px', background: 'rgba(239,68,68,0.1)',
                  borderTop: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '12px',
                }}>
                  {rulesSaveError}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================
// LOGO COMPONENTS
// ============================================

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
      
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#arcGradient)" strokeWidth="2" opacity="0.5"/>
      
      <path 
        d="M 20 70 Q 35 65 50 45 Q 65 25 80 20" 
        stroke="url(#arcGradient)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      
      <path 
        d="M 25 75 Q 40 70 55 55 Q 70 40 82 35" 
        stroke="url(#arcGradient2)" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      
      <circle cx="20" cy="70" r="4" fill="#3b82f6" filter="url(#glow)"/>
      <circle cx="50" cy="45" r="5" fill="#6366f1" filter="url(#glow)"/>
      <circle cx="80" cy="20" r="6" fill="#10b981" filter="url(#glow)"/>
      
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
