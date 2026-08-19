import { zipSync, strToU8 } from 'fflate';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index) {
  let col = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
}

export function toXlsxBuffer(headers, rows) {
  const headerRow = headers.map((h, i) => ({ r: 1, c: i, v: String(h), t: 's' }));
  const dataRows = rows.map((row, ri) =>
    row.map((cell, ci) => {
      const type = typeof cell === 'number' && Number.isFinite(cell) ? 'n' : 's';
      return { r: ri + 2, c: ci, v: String(cell), t: type };
    })
  );

  const sharedStrings = [];
  const sst = new Map();
  const cellToSst = (value) => {
    if (!sst.has(value)) {
      sst.set(value, sharedStrings.length);
      sharedStrings.push(value);
    }
    return sst.get(value);
  };

  const sheet = [...headerRow, ...dataRows.flat()]
    .map((cell) => {
      const ref = `${colName(cell.c)}${cell.r}`;
      if (cell.t === 'n') {
        const num = Number(cell.v);
        return `<c r="${ref}"><v>${Number.isFinite(num) ? num : 0}</v></c>`;
      }
      return `<c r="${ref}" t="s"><v>${cellToSst(cell.v)}</v></c>`;
    })
    .join('');

  const dims = `${colName(headers.length - 1)}${rows.length + 1}`;

  const files = {
    '[Content_Types].xml': strToU8(
      XML_HEADER +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '</Types>'
    ),
    '_rels/.rels': strToU8(
      XML_HEADER +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      XML_HEADER +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets></workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      XML_HEADER +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
        '</Relationships>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      XML_HEADER +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<dimension ref="A1:${dims}"/>` +
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        `<sheetData>${sheet}</sheetData>` +
        '</worksheet>'
    ),
    'xl/sharedStrings.xml': strToU8(
      XML_HEADER +
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' +
        sharedStrings.length +
        '" uniqueCount="' +
        sharedStrings.length +
        '">' +
        sharedStrings.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('') +
        '</sst>'
    ),
  };

  const u8 = zipSync(files, { level: 6 });
  return Buffer.from(u8);
}

export function toCsvBuffer(headers, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  const content = '\uFEFF' + lines.join('\r\n') + '\r\n';
  return Buffer.from(content, 'utf8');
}