import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLines, parseAmount, summarize } from '../src/services/transactionParser.js';

test('parses UK/EU style amounts (1,234.56)', () => {
  assert.equal(parseAmount('1,234.56'), 1234.56);
});

test('parses EU style amounts (1.234,56)', () => {
  assert.equal(parseAmount('1.234,56'), 1234.56);
});

test('parses parenthesis negatives', () => {
  assert.equal(parseAmount('(84.20)'), -84.2);
});

test('parses leading minus', () => {
  assert.equal(parseAmount('-500.00'), -500);
});

test('parses trailing DR marker', () => {
  assert.equal(parseAmount('25.00 DR'), -25);
});

test('parses trailing CR marker', () => {
  assert.equal(parseAmount('25.00 CR'), 25);
});

test('rejects garbage', () => {
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('1.2.3.4.5'), null);
});

test('detects plain integers', () => {
  assert.equal(parseAmount('45'), 45);
});

test('extracts transactions from simple statement lines', () => {
  const { transactions } = parseLines([
    '05/01/2026 SALARY ACME CORP                2,500.00    3,750.50',
    '08/01/2026 SUPERMARKET SHOPPING           (84.20)      3,666.30',
  ]);
  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].date, '2026-01-05');
  assert.equal(transactions[0].amount, 2500);
  assert.equal(transactions[0].balance, 3750.5);
  assert.equal(transactions[1].amount, -84.2);
});

test('supports day-first US-style ordering (31/12/2026)', () => {
  const { transactions } = parseLines(['31/12/2026 REFUND 45.00 145.00']);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].date, '2026-12-31');
});

test('supports dot separated dates', () => {
  const { transactions } = parseLines(['05.01.2026 Payment 10.00 110.00']);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].date, '2026-01-05');
});

test('supports 2-digit years', () => {
  const { transactions } = parseLines(['05/01/26 Payment 10.00 110.00']);
  assert.equal(transactions[0].date, '2026-01-05');
});

test('merges multi-line descriptions', () => {
  const { transactions } = parseLines([
    '05/01/2026 ONLINE RETAIL',
    'PURCHASE AMAZON',
    '12/01/2026 NEXT TXN 5.00 15.00',
  ]);
  assert.equal(transactions.length, 2);
  assert.ok(transactions[0].description.includes('PURCHASE AMAZON'));
});

test('skips statement headers and page markers', () => {
  const { transactions } = parseLines([
    'STATEMENT OF ACCOUNT',
    'Page 1 of 3',
    'Statement Period: 01/01/2026 - 31/01/2026',
    'Date   Description   Amount   Balance',
    '05/01/2026 SALARY 100.00 1100.00',
  ]);
  assert.equal(transactions.length, 1);
});

test('excludes opening/closing balance lines', () => {
  const { transactions } = parseLines([
    '02/01/2026 Opening Balance 1,250.50',
    '05/01/2026 SALARY 100.00 1350.50',
    '31/01/2026 Closing Balance 1350.50',
  ]);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].description, 'SALARY');
});

test('debit markers negate positive amounts', () => {
  const { transactions } = parseLines(['05/01/2026 ATM WITHDRAWAL 200.00 800.00']);
  assert.equal(transactions[0].amount, -200);
});

test('credit markers keep positive sign', () => {
  const { transactions } = parseLines(['05/01/2026 DEPOSIT 300.00 1300.00']);
  assert.equal(transactions[0].amount, 300);
});

test('summarize computes credits, debits, net', () => {
  const { transactions, currency } = parseLines([
    '05/01/2026 SALARY EUR 100.00 1100.00',
    '08/01/2026 SHOP WITHDRAWAL 40.00 1060.00',
  ]);
  const s = summarize(transactions, currency);
  assert.equal(s.count, 2);
  assert.equal(s.credits, 100);
  assert.equal(s.debits, 40);
  assert.equal(s.net, 60);
  assert.equal(s.firstDate, '2026-01-05');
});

test('detects currency codes', () => {
  const { currency } = parseLines(['05/01/2026 SALARY EUR 100.00 1100.00']);
  assert.equal(currency, 'EUR');
});

test('detects currency symbols', () => {
  const { currency } = parseLines(['05/01/2026 SALARY $100.00 $1100.00']);
  assert.equal(currency, '$');
});

test('rejects invalid dates', () => {
  const { transactions } = parseLines(['31/02/2026 BAD 10.00 10.00']);
  assert.equal(transactions.length, 0);
});

test('empty input yields empty result', () => {
  const { transactions } = parseLines([]);
  assert.equal(transactions.length, 0);
});