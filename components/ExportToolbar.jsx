'use client';

import React, { useState } from 'react';
import { exportToPdf, handlePrint, exportToExcel } from '@/lib/exportUtils';

export default function ExportToolbar({
  contentRef,
  pdfFilename = 'report',
  excelData,
  excelSheetName = 'Sheet1',
  excelFilename = 'report',
}) {
  const [generating, setGenerating] = useState(false);

  const onPrint = () => {
    handlePrint(contentRef?.current);
  };

  const onPdf = async () => {
    setGenerating(true);
    try {
      await exportToPdf(contentRef?.current, pdfFilename);
    } finally {
      setGenerating(false);
    }
  };

  const onExcel = () => {
    exportToExcel(excelData, excelSheetName, excelFilename);
  };

  const buttonStyle = {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    background: 'rgba(99, 102, 241, 0.1)',
    color: '#a5b4fc',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  };

  return (
    <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button onClick={onPrint} style={buttonStyle} title="Print">
        🖨️ Print
      </button>
      <button
        onClick={onPdf}
        disabled={generating}
        style={{
          ...buttonStyle,
          cursor: generating ? 'wait' : 'pointer',
          opacity: generating ? 0.6 : 1,
        }}
        title="Download PDF"
      >
        📄 {generating ? 'Generating...' : 'PDF'}
      </button>
      {excelData && excelData.length > 0 && (
        <button onClick={onExcel} style={buttonStyle} title="Download Excel">
          📊 Excel
        </button>
      )}
    </div>
  );
}
