import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LINES = [
  'STATEMENT OF ACCOUNT',
  'Bank of Test PLC',
  'Account Number: 12345678',
  'Statement Period: 01/01/2026 - 31/01/2026',
  '',
  'Date       Description                     Amount     Balance',
  '02/01/2026 Opening Balance                                1,250.50',
  '05/01/2026 SALARY ACME CORP                2,500.00    3,750.50',
  '08/01/2026 SUPERMARKET SHOPPING           (84.20)      3,666.30',
  '12/01/2026 ONLINE RETAIL PURCHASE          (125.99)    3,540.31',
  '15/01/2026 REFUND FROM STORE               45.00       3,585.31',
  '19/01/2026 DIRECT DEBIT UTILITIES           (92.34)     3,492.97',
  '22/01/2026 TRANSFER TO SAVINGS            (500.00)     2,992.97',
  '28/01/2026 ATM WITHDRAWAL                 (200.00)     2,792.97',
  '31/01/2026 Interest Paid                    1.23        2,794.20',
  'Closing Balance                                            2,794.20',
  'Page 1 of 1',
];

function escapeText(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf() {
  const objects = [];
  let stream = '';
  const startY = 720;
  LINES.forEach((line, i) => {
    const y = startY - i * 16;
    stream += `BT /F1 11 Tf 72 ${y} Td (${escapeText(line)}) Tj ET\n`;
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>';
  objects[4] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`;
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n';
  pdf += `0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

const pdf = buildPdf();
const out = join(process.cwd(), 'tmp', 'sample-statement.pdf');
writeFileSync(out, pdf);
console.log(`Wrote ${out} (${pdf.length} bytes)`);