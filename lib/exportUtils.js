import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Captures a DOM element to a PDF and triggers download.
 * Accepts optional brandingOptions { firmName, logoBase64 } for header.
 */
export async function exportToPdf(element, filename = 'report', brandingOptions) {
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0a0f',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const contentRatio = canvas.width / canvas.height;

  const orientation = contentRatio > 1.2 ? 'l' : 'p';
  const pdf = new jsPDF(orientation, 'mm', 'a4');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  let usableHeight = pageHeight - margin * 2;

  // Add branding header if provided
  let headerHeight = 0;
  if (brandingOptions?.firmName || brandingOptions?.logoBase64) {
    let yPos = margin + 2;

    if (brandingOptions.logoBase64) {
      try {
        pdf.addImage(brandingOptions.logoBase64, 'PNG', margin, yPos, 12, 12);
        yPos += 0;
      } catch {
        // skip logo if it fails
      }
    }

    if (brandingOptions.firmName) {
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      const textX = brandingOptions.logoBase64 ? margin + 16 : margin;
      pdf.text(brandingOptions.firmName, textX, yPos + 9);
    }

    headerHeight = 18;
    usableHeight -= headerHeight;
  }

  const contentStart = margin + headerHeight;
  let imgWidth = usableWidth;
  let imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight < usableHeight * 0.6) {
    const scaleFactor = Math.min(usableHeight * 0.85 / imgHeight, 1.5);
    imgHeight *= scaleFactor;
    imgWidth *= scaleFactor;
    if (imgWidth > usableWidth) {
      imgHeight *= usableWidth / imgWidth;
      imgWidth = usableWidth;
    }
  }

  const xOffset = margin + (usableWidth - imgWidth) / 2;
  let heightLeft = imgHeight;
  let position = contentStart;

  pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Opens a new window with the element's HTML cloned into it,
 * applies print-friendly styles, and calls window.print().
 * Accepts optional brandingOptions { firmName, logoBase64 }.
 */
export function handlePrint(element, brandingOptions) {
  if (!element) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const html = element.innerHTML;

  let brandingHtml = '';
  if (brandingOptions?.firmName || brandingOptions?.logoBase64) {
    brandingHtml = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #ddd;">`;
    if (brandingOptions.logoBase64) {
      brandingHtml += `<img src="${brandingOptions.logoBase64}" style="width:40px;height:40px;object-fit:contain;" />`;
    }
    if (brandingOptions.firmName) {
      brandingHtml += `<span style="font-size:18px;font-weight:700;color:#333;">${brandingOptions.firmName}</span>`;
    }
    brandingHtml += `</div>`;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: white !important;
          color: #1a1a1a !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 32px;
          font-size: 14px;
          line-height: 1.6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        h1, h2, h3 { color: #111 !important; }
        h1 { font-size: 22px !important; }
        h2 { font-size: 18px !important; }
        h3 { font-size: 16px !important; }
        p, span, div, label { font-size: 14px !important; color: #222 !important; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { padding: 10px 14px; border: 1px solid #ccc; text-align: left; font-size: 13px !important; }
        th { background: #f0f0f0 !important; font-weight: 700; color: #111 !important; }
        td { color: #222 !important; }
        .no-print { display: none !important; }
        svg { max-width: 100%; }
        @media print {
          body { padding: 16px; }
        }
      </style>
    </head>
    <body>${brandingHtml}${html}</body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

/**
 * Takes an array of objects (table rows), creates an Excel workbook,
 * and downloads as .xlsx.
 */
export function exportToExcel(data, sheetName = 'Sheet1', filename = 'report') {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
