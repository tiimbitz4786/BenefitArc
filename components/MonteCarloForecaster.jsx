'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid, Cell } from 'recharts';
import { useKpis, DEFAULT_KPIS } from './KpiProvider';
import ExportToolbar from './ExportToolbar';
import ScenarioSelector from './ScenarioSelector';
import useSavedScenarios from '@/hooks/useSavedScenarios';
import { useDemo } from './DemoProvider';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STAGES_META = [
  { key: 'application', label: 'Application' },
  { key: 'reconsideration', label: 'Reconsideration' },
  { key: 'hearing', label: 'ALJ Hearing' },
  { key: 'appeals_council', label: 'Appeals Council' },
  { key: 'federal_court', label: 'Federal Court' },
];

const STATUS_KEYWORDS = {
  application: ['application', 'initial', 'app', 'title ii', 'title xvi', 'initial claim', 'new claim'],
  reconsideration: ['reconsideration', 'recon', 'reconsider'],
  hearing: ['hearing', 'alj', 'oho', 'administrative law judge'],
  appeals_council: ['appeals council', 'ac', 'appeals'],
  federal_court: ['federal court', 'federal', 'usdc', 'district court'],
};

const TIME_HEADER_PATTERNS = [
  { pattern: /days?\s*(in\s*)?stage/i, type: 'days' },
  { pattern: /days?\s*elapsed/i, type: 'days' },
  { pattern: /days?\s*pending/i, type: 'days' },
  { pattern: /^days$/i, type: 'days' },
  { pattern: /duration/i, type: 'days' },
  { pattern: /start\s*date/i, type: 'date' },
  { pattern: /filing\s*date/i, type: 'date' },
  { pattern: /filed\s*date/i, type: 'date' },
  { pattern: /date\s*filed/i, type: 'date' },
  { pattern: /open\s*date/i, type: 'date' },
];

const LABEL_HEADER_PATTERNS = [
  /case\s*id/i, /case\s*#/i, /case\s*number/i, /client/i, /name/i, /claimant/i, /id/i,
];

// ─── STYLING ─────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(236, 72, 153, 0.3)',
  background: 'rgba(15, 15, 25, 0.8)',
  color: '#f8fafc',
  fontSize: '14px',
  outline: 'none',
};

const cardStyle = {
  background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(20, 20, 35, 0.9) 100%)',
  borderRadius: '16px',
  border: '1px solid rgba(236, 72, 153, 0.2)',
  padding: '24px',
  marginBottom: '24px',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function normalRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function formatCurrency(val) {
  if (val == null || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString();
}

function detectStage(statusText) {
  if (!statusText) return 'hearing';
  const lower = statusText.toString().toLowerCase().trim();
  for (const [stage, keywords] of Object.entries(STATUS_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return stage;
    }
  }
  return 'hearing';
}

function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function detectColumns(headers) {
  let statusCol = -1;
  let timeCol = -1;
  let timeType = 'days';
  let labelCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toString().trim();

    // Status column
    if (statusCol === -1) {
      if (/status|stage|case\s*status|level|step/i.test(h)) {
        statusCol = i;
      }
    }

    // Time column
    if (timeCol === -1) {
      for (const pat of TIME_HEADER_PATTERNS) {
        if (pat.pattern.test(h)) {
          timeCol = i;
          timeType = pat.type;
          break;
        }
      }
    }

    // Label column
    if (labelCol === -1) {
      for (const pat of LABEL_HEADER_PATTERNS) {
        if (pat.test(h)) {
          labelCol = i;
          break;
        }
      }
    }
  }

  return { statusCol, timeCol, timeType, labelCol };
}

function parseDaysFromValue(val, timeType) {
  if (val == null || val === '') return 0;
  const str = val.toString().trim();
  if (timeType === 'date') {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 0;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(0, Math.round(num));
}

// ─── LOGO ────────────────────────────────────────────────────────────────────

function BenefitArcLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mcArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="mcGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="url(#mcArcGradient)" strokeWidth="2" opacity="0.5"/>
      <path d="M 25 65 Q 50 20 75 65" stroke="url(#mcArcGradient)" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#mcGlow)"/>
      <circle cx="25" cy="65" r="4" fill="#ec4899" filter="url(#mcGlow)"/>
      <circle cx="50" cy="30" r="5" fill="#f43f5e" filter="url(#mcGlow)"/>
      <circle cx="75" cy="65" r="4" fill="#ec4899" filter="url(#mcGlow)"/>
      {/* Dice accent */}
      <rect x="38" y="42" width="24" height="24" rx="4" stroke="url(#mcArcGradient)" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="44" cy="48" r="2" fill="url(#mcArcGradient)" opacity="0.5"/>
      <circle cx="56" cy="60" r="2" fill="url(#mcArcGradient)" opacity="0.5"/>
      <circle cx="50" cy="54" r="2" fill="url(#mcArcGradient)" opacity="0.5"/>
    </svg>
  );
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 15, 25, 0.95)', border: '1px solid rgba(236, 72, 153, 0.3)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f8fafc',
    }}>
      <p style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#ec4899', margin: '2px 0' }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MonteCarloForecaster() {
  const { kpis } = useKpis();

  // Wizard state
  const [step, setStep] = useState(0);

  // File parsing
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  // Column mapping
  const [statusCol, setStatusCol] = useState(-1);
  const [timeCol, setTimeCol] = useState(-1);
  const [timeType, setTimeType] = useState('days');
  const [labelCol, setLabelCol] = useState(-1);

  // Simulation params
  const [numSims, setNumSims] = useState(3000);
  const [feeVariance, setFeeVariance] = useState(0.15);
  const [winRateVariance, setWinRateVariance] = useState(0.05);
  const [simKpis, setSimKpis] = useState({});

  // Simulation state
  const [simProgress, setSimProgress] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [results, setResults] = useState(null);

  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const { isDemoMode } = useDemo();
  const scenarioHook = useSavedScenarios('monte-carlo');
  const getDataToSave = () => ({
    numSims, feeVariance, winRateVariance, simKpis,
    results: results ? { summary: results.summary, perCase: results.perCase?.slice(0, 50) } : null,
  });
  const handleLoadScenario = async (id) => {
    const s = await scenarioHook.loadScenario(id);
    if (s?.data) {
      const d = s.data;
      if (d.numSims) setNumSims(d.numSims);
      if (d.feeVariance != null) setFeeVariance(d.feeVariance);
      if (d.winRateVariance != null) setWinRateVariance(d.winRateVariance);
      if (d.simKpis) setSimKpis(d.simKpis);
    }
  };

  // Initialize simKpis from context
  useEffect(() => {
    const params = {};
    STAGES_META.forEach(s => {
      params[`${s.key}_fee`] = parseFloat(kpis[`${s.key}_fee`]) || DEFAULT_KPIS[`${s.key}_fee`];
      params[`${s.key}_win_rate`] = parseFloat(kpis[`${s.key}_win_rate`]) || DEFAULT_KPIS[`${s.key}_win_rate`];
      params[`${s.key}_adj_months`] = parseFloat(kpis[`${s.key}_adj_months`]) || DEFAULT_KPIS[`${s.key}_adj_months`];
      params[`${s.key}_payment_lag_days`] = parseFloat(kpis[`${s.key}_payment_lag_days`]) || 60;
    });
    params.eaja_fee = parseFloat(kpis.eaja_fee) || DEFAULT_KPIS.eaja_fee;
    setSimKpis(params);
  }, [kpis]);

  // ─── FILE HANDLING ───────────────────────────────────────────────────────

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setParseError('');
    setParsing(true);
    setOcrStatus('');
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error('File has fewer than 2 rows.');
        setHeaders(rows[0]);
        setRawData(rows.slice(1));
        const detected = detectColumns(rows[0]);
        setStatusCol(detected.statusCol);
        setTimeCol(detected.timeCol);
        setTimeType(detected.timeType);
        setLabelCol(detected.labelCol);
        setStep(2);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) throw new Error('Spreadsheet has fewer than 2 rows.');
        setHeaders(rows[0].map(h => (h ?? '').toString()));
        setRawData(rows.slice(1).map(r => r.map(c => (c ?? '').toString())));
        const detected = detectColumns(rows[0].map(h => (h ?? '').toString()));
        setStatusCol(detected.statusCol);
        setTimeCol(detected.timeCol);
        setTimeType(detected.timeType);
        setLabelCol(detected.labelCol);
        setStep(2);
      } else if (ext === 'pdf') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let fullText = '';
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const pageText = content.items.map(i => i.str).join(' ');
          fullText += pageText + '\n';
        }

        if (fullText.trim().length < 50) {
          // Fall back to OCR
          setOcrStatus('Text extraction yielded little content. Running OCR...');
          let ocrText = '';
          for (let p = 1; p <= pdf.numPages; p++) {
            setOcrStatus(`OCR: processing page ${p} of ${pdf.numPages}...`);
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
            ocrText += text + '\n';
          }
          fullText = ocrText;
          setOcrStatus('OCR complete.');
        }

        // Parse the extracted text as CSV-like rows
        const lines = fullText.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('Could not extract enough data from PDF.');

        // Try splitting by common delimiters
        let delimiter = ',';
        if (lines[0].split('\t').length > lines[0].split(',').length) delimiter = '\t';
        else if (lines[0].split('|').length > lines[0].split(',').length) delimiter = '|';

        // Also try splitting by multiple spaces if no delimiters found
        const splitLine = (line) => {
          const parts = line.split(delimiter).map(s => s.trim());
          if (parts.length <= 1 && delimiter === ',') {
            return line.split(/\s{2,}/).map(s => s.trim());
          }
          return parts;
        };

        const rows = lines.map(splitLine);
        setHeaders(rows[0]);
        setRawData(rows.slice(1));
        const detected = detectColumns(rows[0]);
        setStatusCol(detected.statusCol);
        setTimeCol(detected.timeCol);
        setTimeType(detected.timeType);
        setLabelCol(detected.labelCol);
        setStep(2);
      } else {
        throw new Error(`Unsupported file type: .${ext}. Please upload CSV, Excel, or PDF.`);
      }
    } catch (err) {
      setParseError(err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e) => {
    const file = e.target?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── BUILD CASES ─────────────────────────────────────────────────────────

  const cases = useMemo(() => {
    if (!rawData || statusCol < 0) return [];
    return rawData.map((row, i) => {
      const statusText = (row[statusCol] || '').toString();
      const stage = detectStage(statusText);
      const days = timeCol >= 0 ? parseDaysFromValue(row[timeCol], timeType) : 0;
      const label = labelCol >= 0 ? (row[labelCol] || `Case ${i + 1}`).toString() : `Case ${i + 1}`;
      return { label, stage, statusText, daysInStage: days, rowIndex: i };
    }).filter(c => c.statusText !== '');
  }, [rawData, statusCol, timeCol, timeType, labelCol]);

  // ─── MONTE CARLO ENGINE ──────────────────────────────────────────────────

  const runSimulation = useCallback(() => {
    if (cases.length === 0) return;
    setSimRunning(true);
    setSimProgress(0);
    setResults(null);
    setStep(4);

    const totalRevenues = [];
    const caseResults = cases.map(() => ({ revenues: [], timings: [], wins: 0 }));
    const CHUNK_SIZE = 100;
    let simsDone = 0;

    const runChunk = () => {
      const end = Math.min(simsDone + CHUNK_SIZE, numSims);

      for (let sim = simsDone; sim < end; sim++) {
        let totalRev = 0;

        for (let c = 0; c < cases.length; c++) {
          const cs = cases[c];
          const stage = cs.stage;
          const baseRate = simKpis[`${stage}_win_rate`] || 0.5;
          const baseFee = simKpis[`${stage}_fee`] || 5000;
          const adjMonths = simKpis[`${stage}_adj_months`] || 10;
          const payLag = simKpis[`${stage}_payment_lag_days`] || 60;

          // Sample win rate with variance
          const sampledRate = Math.max(0, Math.min(1, baseRate + normalRandom() * winRateVariance));
          const won = Math.random() < sampledRate;

          if (won) {
            caseResults[c].wins++;
            // Sample fee with variance
            const sampledFee = Math.max(0, baseFee * (1 + normalRandom() * feeVariance));
            let caseRev = sampledFee;

            // EAJA bonus for federal court wins
            if (stage === 'federal_court') {
              const eajaFee = simKpis.eaja_fee || DEFAULT_KPIS.eaja_fee;
              caseRev += eajaFee * (1 + normalRandom() * feeVariance * 0.5);
            }

            caseResults[c].revenues.push(caseRev);

            // Calculate timing: remaining adj time + payment lag
            const elapsedMonths = cs.daysInStage / 30.44;
            const remainingMonths = Math.max(0, adjMonths - elapsedMonths);
            const totalDays = remainingMonths * 30.44 + payLag;
            caseResults[c].timings.push(totalDays);

            totalRev += caseRev;
          } else {
            caseResults[c].revenues.push(0);
            caseResults[c].timings.push(0);
          }
        }

        totalRevenues.push(totalRev);
      }

      simsDone = end;
      setSimProgress(Math.round((simsDone / numSims) * 100));

      if (simsDone < numSims) {
        setTimeout(runChunk, 0);
      } else {
        // Build results
        const p10 = percentile(totalRevenues, 10);
        const p50 = percentile(totalRevenues, 50);
        const p90 = percentile(totalRevenues, 90);
        const mean = totalRevenues.reduce((a, b) => a + b, 0) / totalRevenues.length;

        // Histogram (30 bins)
        const minRev = Math.min(...totalRevenues);
        const maxRev = Math.max(...totalRevenues);
        const binWidth = (maxRev - minRev) / 30 || 1;
        const histBins = Array.from({ length: 30 }, (_, i) => ({
          binStart: minRev + i * binWidth,
          binEnd: minRev + (i + 1) * binWidth,
          label: formatCurrency(minRev + (i + 0.5) * binWidth),
          count: 0,
          isP10: false,
          isP50: false,
          isP90: false,
        }));
        totalRevenues.forEach(r => {
          const idx = Math.min(29, Math.floor((r - minRev) / binWidth));
          histBins[idx].count++;
        });
        // Mark percentile bins
        histBins.forEach(bin => {
          if (p10 >= bin.binStart && p10 < bin.binEnd) bin.isP10 = true;
          if (p50 >= bin.binStart && p50 < bin.binEnd) bin.isP50 = true;
          if (p90 >= bin.binStart && p90 < bin.binEnd) bin.isP90 = true;
        });

        // Revenue timeline by month (cumulative)
        const maxMonths = 36;
        const timeline = [];
        for (let m = 1; m <= maxMonths; m++) {
          const monthP10Revs = [];
          const monthP50Revs = [];
          const monthP90Revs = [];

          // For each simulation, compute cumulative revenue up to month m
          for (let sim = 0; sim < numSims; sim++) {
            let cumRev = 0;
            for (let c = 0; c < cases.length; c++) {
              const timing = caseResults[c].timings[sim];
              const rev = caseResults[c].revenues[sim];
              if (rev > 0 && timing > 0 && timing / 30.44 <= m) {
                cumRev += rev;
              }
            }
            monthP10Revs.push(cumRev);
          }

          monthP10Revs.sort((a, b) => a - b);
          timeline.push({
            month: `M${m}`,
            P10: percentile(monthP10Revs, 10),
            P50: percentile(monthP10Revs, 50),
            P90: percentile(monthP10Revs, 90),
          });
        }

        // Per-case summary
        const perCase = cases.map((cs, c) => {
          const cr = caseResults[c];
          const winProb = cr.wins / numSims;
          const wonRevs = cr.revenues.filter(r => r > 0);
          const expectedValue = cr.revenues.reduce((a, b) => a + b, 0) / numSims;
          const wonTimings = cr.timings.filter(t => t > 0);
          const medianTiming = wonTimings.length > 0 ? percentile(wonTimings, 50) : 0;
          const caseP10 = percentile(cr.revenues, 10);
          const caseP90 = percentile(cr.revenues, 90);
          return {
            label: cs.label,
            stage: STAGES_META.find(s => s.key === cs.stage)?.label || cs.stage,
            stageKey: cs.stage,
            daysInStage: cs.daysInStage,
            winProb,
            expectedValue,
            medianTiming: Math.round(medianTiming),
            p10: caseP10,
            p90: caseP90,
          };
        });

        setResults({ p10, p50, p90, mean, histogram: histBins, timeline, perCase, totalRevenues });
        setSimRunning(false);
        setStep(5);
      }
    };

    setTimeout(runChunk, 0);
  }, [cases, numSims, simKpis, feeVariance, winRateVariance]);

  // ─── EXCEL DATA ──────────────────────────────────────────────────────────

  const excelData = useMemo(() => {
    if (!results) return null;
    const rows = [
      { Metric: 'P10 Revenue', Value: Math.round(results.p10) },
      { Metric: 'Median (P50) Revenue', Value: Math.round(results.p50) },
      { Metric: 'P90 Revenue', Value: Math.round(results.p90) },
      { Metric: 'Mean Revenue', Value: Math.round(results.mean) },
      { Metric: 'Simulations', Value: numSims },
      { Metric: 'Cases', Value: cases.length },
      { Metric: '', Value: '' },
    ];
    results.perCase.forEach(c => {
      rows.push({
        Metric: c.label,
        Stage: c.stage,
        'Days in Stage': c.daysInStage,
        'Win Probability': `${Math.round(c.winProb * 100)}%`,
        'Expected Value': Math.round(c.expectedValue),
        'Median Timing (days)': c.medianTiming,
        'P10 Revenue': Math.round(c.p10),
        'P90 Revenue': Math.round(c.p90),
      });
    });
    return rows;
  }, [results, numSims, cases.length]);

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
          Monte Carlo Revenue Forecaster
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.8', marginBottom: '24px' }}>
          Upload your case pipeline data (CSV, Excel, or PDF) and run thousands of simulations
          to forecast expected revenue with confidence intervals. The tool uses your firm's KPI settings
          to model win probabilities, fee amounts, adjudication timelines, and payment lags.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '24px' }}>
          {[
            { icon: '📁', text: 'Upload your case data (CSV, Excel, or scanned PDF with OCR)' },
            { icon: '🔍', text: 'Map columns and preview your data' },
            { icon: '⚙️', text: 'Configure simulation parameters and KPIs' },
            { icon: '🎲', text: 'Run Monte Carlo simulations' },
            { icon: '📊', text: 'View P10/P50/P90 forecasts, histograms, and timelines' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.05)' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{item.text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(1)}
          style={{
            padding: '14px 48px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
            color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(236, 72, 153, 0.3)',
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
          Step 1: Upload Case Data
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          Upload a CSV, Excel (.xlsx), or PDF file containing your case pipeline data.
          The file should include at minimum a column for case status/stage.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'rgba(236, 72, 153, 0.6)' : 'rgba(236, 72, 153, 0.25)'}`,
            borderRadius: '16px',
            padding: '60px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(236, 72, 153, 0.08)' : 'rgba(15, 15, 25, 0.5)',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.txt"
            onChange={onFileSelect}
            style={{ display: 'none' }}
          />
          {parsing ? (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: '#ec4899', fontWeight: '600' }}>Processing file...</p>
              {ocrStatus && <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>{ocrStatus}</p>}
            </>
          ) : (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
              <p style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '4px' }}>
                Drop file here or click to browse
              </p>
              <p style={{ color: '#64748b', fontSize: '12px' }}>
                Supported: CSV, Excel (.xlsx), PDF (text or scanned)
              </p>
            </>
          )}
        </div>

        {parseError && (
          <div style={{
            marginTop: '16px', padding: '12px', borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', fontSize: '13px',
          }}>
            {parseError}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button onClick={() => setStep(0)} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)',
            background: 'transparent', color: '#ec4899', fontSize: '13px', cursor: 'pointer',
          }}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
          Step 2: Column Mapping
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          We detected {rawData?.length || 0} data rows from <strong style={{ color: '#f8fafc' }}>{fileName}</strong>.
          Verify or adjust the column assignments below.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Status / Stage Column *
            </label>
            <select
              value={statusCol}
              onChange={(e) => setStatusCol(parseInt(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value={-1}>-- Select --</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Time / Days Column
            </label>
            <select
              value={timeCol}
              onChange={(e) => setTimeCol(parseInt(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value={-1}>-- None --</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Label / Case ID Column
            </label>
            <select
              value={labelCol}
              onChange={(e) => setLabelCol(parseInt(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value={-1}>-- None --</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
            </select>
          </div>
        </div>

        {timeCol >= 0 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Time format
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[{ val: 'days', label: 'Days count' }, { val: 'date', label: 'Date (calculates days since)' }].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setTimeType(opt.val)}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
                    border: timeType === opt.val ? '1px solid rgba(236, 72, 153, 0.5)' : '1px solid rgba(99, 102, 241, 0.2)',
                    background: timeType === opt.val ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                    color: timeType === opt.val ? '#f9a8d4' : '#94a3b8',
                    fontSize: '12px', fontWeight: '500',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Data preview */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
            Data Preview (first 5 rows)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 12px', textAlign: 'left',
                      borderBottom: '1px solid rgba(236, 72, 153, 0.2)',
                      color: i === statusCol ? '#ec4899' : i === timeCol ? '#3b82f6' : i === labelCol ? '#10b981' : '#94a3b8',
                      fontWeight: '600', whiteSpace: 'nowrap',
                    }}>
                      {h || `Col ${i + 1}`}
                      {i === statusCol && ' ●'}
                      {i === timeCol && ' ●'}
                      {i === labelCol && ' ●'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rawData || []).slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td key={ci} style={{
                        padding: '6px 12px',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                        color: '#cbd5e1', whiteSpace: 'nowrap',
                      }}>
                        {row[ci] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {statusCol < 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fcd34d', fontSize: '12px', marginBottom: '16px',
          }}>
            Please select a Status/Stage column to continue.
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <button onClick={() => { setStep(1); setRawData(null); }} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)',
            background: 'transparent', color: '#ec4899', fontSize: '13px', cursor: 'pointer',
          }}>
            ← Re-upload
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={statusCol < 0}
            style={{
              padding: '10px 32px', borderRadius: '10px', border: 'none',
              background: statusCol < 0 ? 'rgba(236, 72, 153, 0.2)' : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
              color: 'white', fontSize: '14px', fontWeight: '600',
              cursor: statusCol < 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Next: Configure Simulation →
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
          Step 3: Simulation Parameters
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          Adjust the KPIs and variance settings for the simulation.
          Values are pre-populated from your KPI Settings.
        </p>

        {/* Simulation settings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Number of Simulations
            </label>
            <input
              type="number" min="100" max="50000" step="100"
              value={numSims}
              onChange={(e) => setNumSims(Math.max(100, parseInt(e.target.value) || 3000))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Fee Variance (±%)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" max="50" step="1"
                value={Math.round(feeVariance * 100)}
                onChange={(e) => setFeeVariance(Math.max(0, (parseInt(e.target.value) || 15)) / 100)}
                style={{ ...inputStyle, paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>%</span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
              Win Rate Variance (±)
            </label>
            <input
              type="number" min="0" max="0.2" step="0.01"
              value={winRateVariance}
              onChange={(e) => setWinRateVariance(Math.max(0, parseFloat(e.target.value) || 0.05))}
              style={inputStyle}
            />
          </div>
        </div>

        {/* KPI overrides by stage */}
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '12px' }}>
          Stage KPIs
        </h3>
        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Stage', 'Fee ($)', 'Win Rate (%)', 'Adj. Time (mo)', 'Pay Lag (days)'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '1px solid rgba(236, 72, 153, 0.2)',
                    color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAGES_META.map(s => (
                <tr key={s.key}>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#f8fafc', fontWeight: '500' }}>
                    {s.label}
                  </td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <input type="number" value={simKpis[`${s.key}_fee`] || ''} onChange={(e) => setSimKpis(prev => ({ ...prev, [`${s.key}_fee`]: parseFloat(e.target.value) || 0 }))}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '90px' }} />
                  </td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <input type="number" value={Math.round((simKpis[`${s.key}_win_rate`] || 0) * 100)} onChange={(e) => setSimKpis(prev => ({ ...prev, [`${s.key}_win_rate`]: (parseFloat(e.target.value) || 0) / 100 }))}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '70px' }} />
                  </td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <input type="number" value={simKpis[`${s.key}_adj_months`] || ''} onChange={(e) => setSimKpis(prev => ({ ...prev, [`${s.key}_adj_months`]: parseFloat(e.target.value) || 0 }))}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '70px' }} />
                  </td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <input type="number" value={simKpis[`${s.key}_payment_lag_days`] || ''} onChange={(e) => setSimKpis(prev => ({ ...prev, [`${s.key}_payment_lag_days`]: parseFloat(e.target.value) || 0 }))}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '70px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EAJA Fee */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
            EAJA Fee (added to Federal Court wins)
          </label>
          <div style={{ position: 'relative', maxWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>$</span>
            <input
              type="number"
              value={simKpis.eaja_fee || ''}
              onChange={(e) => setSimKpis(prev => ({ ...prev, eaja_fee: parseFloat(e.target.value) || 0 }))}
              style={{ ...inputStyle, paddingLeft: '28px' }}
            />
          </div>
        </div>

        {/* Case summary */}
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(236, 72, 153, 0.06)', border: '1px solid rgba(236, 72, 153, 0.15)',
          fontSize: '13px', color: '#f9a8d4', marginBottom: '20px',
        }}>
          Ready to simulate <strong>{cases.length}</strong> cases across <strong>{numSims.toLocaleString()}</strong> iterations.
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(2)} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)',
            background: 'transparent', color: '#ec4899', fontSize: '13px', cursor: 'pointer',
          }}>
            ← Back
          </button>
          <button
            onClick={runSimulation}
            disabled={cases.length === 0}
            style={{
              padding: '14px 48px', borderRadius: '12px', border: 'none',
              background: cases.length === 0 ? 'rgba(236, 72, 153, 0.2)' : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
              color: 'white', fontSize: '15px', fontWeight: '700',
              cursor: cases.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cases.length > 0 ? '0 8px 24px rgba(236, 72, 153, 0.3)' : 'none',
            }}
          >
            Run Simulation
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <div style={cardStyle}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎲</div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '12px' }}>
          Running Simulation
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
          Simulating {numSims.toLocaleString()} scenarios for {cases.length} cases...
        </p>

        <div style={{
          height: '8px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.15)',
          overflow: 'hidden', marginBottom: '12px',
        }}>
          <div style={{
            height: '100%', borderRadius: '4px',
            background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
            width: `${simProgress}%`,
            transition: 'width 0.2s ease',
          }} />
        </div>
        <p style={{ color: '#ec4899', fontSize: '14px', fontWeight: '600' }}>{simProgress}%</p>
      </div>
    </div>
  );

  const renderStep5 = () => {
    if (!results) return null;

    return (
      <div ref={contentRef}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'P10 (Conservative)', value: results.p10, color: '#f59e0b' },
            { label: 'P50 (Median)', value: results.p50, color: '#ec4899' },
            { label: 'P90 (Optimistic)', value: results.p90, color: '#10b981' },
            { label: 'Mean', value: results.mean, color: '#6366f1' },
          ].map((card, i) => (
            <div key={i} style={{
              ...cardStyle,
              borderColor: `${card.color}33`,
              textAlign: 'center',
              marginBottom: 0,
            }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: card.color }}>
                {formatCurrency(card.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue Distribution Histogram */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
            Revenue Distribution ({numSims.toLocaleString()} simulations)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results.histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<ChartTooltip formatter={(v) => v} />} />
              <Bar dataKey="count" name="Simulations" radius={[4, 4, 0, 0]}>
                {results.histogram.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isP50 ? '#ec4899' : entry.isP10 ? '#f59e0b' : entry.isP90 ? '#10b981' : 'rgba(236, 72, 153, 0.4)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '11px' }}>
            <span style={{ color: '#f59e0b' }}>● P10</span>
            <span style={{ color: '#ec4899' }}>● P50 (Median)</span>
            <span style={{ color: '#10b981' }}>● P90</span>
          </div>
        </div>

        {/* Revenue Timeline */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
            Cumulative Revenue Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={results.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
              <Area type="monotone" dataKey="P10" stroke="none" fill="rgba(236, 72, 153, 0.15)" name="P10" />
              <Area type="monotone" dataKey="P90" stroke="none" fill="rgba(236, 72, 153, 0.1)" name="P90" />
              <Line type="monotone" dataKey="P50" stroke="#ec4899" strokeWidth={2} dot={false} name="Median (P50)" />
              <Line type="monotone" dataKey="P10" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P10" />
              <Line type="monotone" dataKey="P90" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P90" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Per-Case Table */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
            Per-Case Results
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {['Case', 'Stage', 'Days in Stage', 'Win Prob.', 'Expected Value', 'Median Timing', 'P10 Rev', 'P90 Rev'].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left',
                      borderBottom: '2px solid rgba(236, 72, 153, 0.2)',
                      color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap',
                      position: 'sticky', top: 0, background: 'rgba(15, 15, 25, 0.98)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.perCase.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#f8fafc', fontWeight: '500', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.label}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#cbd5e1' }}>
                      {c.stage}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#cbd5e1' }}>
                      {c.daysInStage}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: c.winProb >= 0.5 ? '#10b981' : c.winProb >= 0.3 ? '#f59e0b' : '#f87171' }}>
                      {Math.round(c.winProb * 100)}%
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#f8fafc', fontWeight: '600' }}>
                      {formatCurrency(c.expectedValue)}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#cbd5e1' }}>
                      {c.medianTiming > 0 ? `${c.medianTiming}d` : '—'}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#f59e0b' }}>
                      {formatCurrency(c.p10)}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', color: '#10b981' }}>
                      {formatCurrency(c.p90)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export + Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
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
            pdfFilename="BenefitArc-Monte-Carlo-Forecast"
            excelData={excelData}
            excelSheetName="Monte Carlo"
            excelFilename="BenefitArc-Monte-Carlo-Forecast"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
          <button onClick={() => { setStep(3); setResults(null); }} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)',
            background: 'transparent', color: '#ec4899', fontSize: '13px', cursor: 'pointer',
          }}>
            ← Adjust Parameters
          </button>
          <button onClick={() => { setStep(0); setRawData(null); setResults(null); setHeaders([]); }} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'transparent', color: '#a5b4fc', fontSize: '13px', cursor: 'pointer',
          }}>
            Start Over
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(236, 72, 153, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(236, 72, 153, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        {step !== 5 && (
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ filter: 'drop-shadow(0 0 30px rgba(236, 72, 153, 0.4))', marginBottom: '16px' }}>
              <BenefitArcLogo size={70} />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px' }}>
              Monte Carlo Forecaster
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
              Probabilistic revenue forecasting powered by Monte Carlo simulation.
            </p>

            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              {['Welcome', 'Upload', 'Map', 'Configure', 'Simulate', 'Results'].map((s, i) => (
                <div key={i} style={{
                  width: '32px', height: '4px', borderRadius: '2px',
                  background: i <= step ? 'linear-gradient(90deg, #ec4899, #f43f5e)' : 'rgba(99, 102, 241, 0.15)',
                  transition: 'background 0.3s ease',
                }} title={s} />
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px' }}>
              Forecast Results
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              {cases.length} cases × {numSims.toLocaleString()} simulations • {fileName}
            </p>
          </div>
        )}

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#ec4899', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
            ← Back to Tools
          </a>
        </div>
      </div>
    </div>
  );
}
