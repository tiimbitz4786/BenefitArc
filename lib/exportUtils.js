import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Captures a DOM element to a PDF and triggers download.
 * Uses html2canvas to snapshot the element (handles SVG charts),
 * then converts to PDF via jsPDF (auto-sizes to fit content, A4 portrait).
 */
export async function exportToPdf(element, filename = 'report') {
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0a0f',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = -(imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Opens a new window with the element's HTML cloned into it,
 * applies print-friendly styles, and calls window.print().
 */
export function handlePrint(element) {
  if (!element) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const html = element.innerHTML;

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
          padding: 24px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        th { background: #f5f5f5 !important; font-weight: 600; }
        .no-print { display: none !important; }
        svg { max-width: 100%; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to render, then print
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
