import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { toCsvBuffer, toXlsxBuffer } from '../src/services/exporter.js';

const HEADERS = ['Date', 'Description', 'Amount', 'Balance'];
const ROWS = [
  ['2026-01-05', 'SALARY ACME CORP', 2500, 3750.5],
  ['2026-01-08', 'Store, "The Shop"', -84.2, 3666.3],
];

test('CSV includes UTF-8 BOM for Excel', () => {
  const buf = toCsvBuffer(HEADERS, ROWS);
  assert.equal(buf.subarray(0, 3).toString('hex'), 'efbbbf');
});

test('CSV quotes fields with commas and quotes', () => {
  const csv = toCsvBuffer(HEADERS, ROWS).toString('utf8');
  assert.ok(csv.includes('"Store, ""The Shop"""'));
});

test('CSV has header row and correct row count', () => {
  const csv = toCsvBuffer(HEADERS, ROWS).toString('utf8');
  const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith('Date,Description,Amount,Balance'));
});

test('XLSX is a valid zip with required parts', () => {
  const buf = toXlsxBuffer(HEADERS, ROWS);
  const files = unzipSync(new Uint8Array(buf));
  for (const required of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/worksheets/sheet1.xml',
    'xl/sharedStrings.xml',
  ]) {
    assert.ok(files[required], `missing ${required}`);
  }
});

test('XLSX contains all values', () => {
  const buf = toXlsxBuffer(HEADERS, ROWS);
  const files = unzipSync(new Uint8Array(buf));
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  const sst = strFromU8(files['xl/sharedStrings.xml']);
  assert.ok(sheet.includes('A1:D3'));
  assert.ok(sst.includes('SALARY ACME CORP'));
  assert.ok(sst.includes('Store, &quot;The Shop&quot;'));
  assert.ok(sheet.includes('<v>2500</v>'));
});

test('XLSX escapes XML special chars', () => {
  const buf = toXlsxBuffer(HEADERS, [['2026-01-05', 'A & B < > "C"', 1, null]]);
  const files = unzipSync(new Uint8Array(buf));
  const sst = strFromU8(files['xl/sharedStrings.xml']);
  assert.ok(sst.includes('A &amp; B &lt; &gt; &quot;C&quot;'));
  assert.ok(!sst.includes('&B'));
});

test('CSV handles null cells as empty', () => {
  const csv = toCsvBuffer(HEADERS, [['2026-01-05', '', null, 100]]).toString('utf8');
  assert.ok(csv.includes('2026-01-05,,,100'));
});