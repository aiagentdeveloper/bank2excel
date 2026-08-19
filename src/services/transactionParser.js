const DATE_PATTERNS = [
  /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[.,]\d{3})?(?:\s|$)/,
];

const AMOUNT_PATTERN =
  /(-?\d+(?:[.,]\d{3})*(?:[.,]\d{2})|\(-?\d+(?:[.,]\d{3})*(?:[.,]\d{2})\))/;
const AMOUNT_PATTERN_GLOBAL = new RegExp(AMOUNT_PATTERN.source, 'g');

const CURRENCY_SYMBOLS = /[$€£¥₺₹₽]|\b(USD|EUR|GBP|TRY|INR|RUB|JPY|CAD|AUD|CHF|CNY)\b/i;
const CURRENCY_CODES = /^(USD|EUR|GBP|TRY|INR|RUB|JPY|CAD|AUD|CHF|CNY)$/i;

const SKIP_LINE_PATTERNS = [
  /^page\s+\d+\s+of\s+\d+/i,
  /^(opening|closing)\s+balance/i,
  /^statement\s+(from|date|period|no\.?|number)/i,
  /^account\s+(number|no\.?|name|type)/i,
  /^(interest|charges|fees|tax|vat)\s*(?:paid|charged|earned)?\s*$/i,
  /^beginning\s+balance/i,
  /^ending\s+balance/i,
  /^(debits?|credits?|withdrawals?|deposits?|total)\s*:?/i,
  /^transaction\s+(details?|date|description|amount|balance)/i,
  /^(date|description|amount|balance)\s+\|?/i,
  /^\s*(bank\s+of|citibank|chase|wells\s+fargo|hsbc|bofa|lloyds|barclays|santander|revolut|monzo|wise)\b/i,
  /^(please|for|if|this|your|visit|call|contact|thank)/i,
  /^\s*$/,
];

const DEBIT_MARKERS = /(^|\s)(DR|DB|DEBIT|WITHDRAWAL|PAYMENT|FEE|CHARGE)\s*$/i;
const CREDIT_MARKERS = /(^|\s)(CR|DEPOSIT|CREDIT|REFUND)\s*$/i;
const BALANCE_ONLY_LINES = /^(opening|closing|beginning|ending|start|end)\s+(balance|bal)$/i;

function normalizeDate(day, month, year) {
  const d = Number(day);
  const m = Number(month);
  let y = Number(year);
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  if (y < 100) y += 2000;
  if (y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function parseAmount(raw) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (s === '') return null;

  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  } else if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.endsWith('DR') || s.endsWith('DB') || s.endsWith('DEBIT')) {
    negative = true;
    s = s.replace(/\s*(DR|DB|DEBIT)\s*$/i, '');
  }
  if (s.endsWith('CR') || s.endsWith('CREDIT')) {
    s = s.replace(/\s*(CR|CREDIT)\s*$/i, '');
  }

  s = s.replace(/\s/g, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    const n = Number(s);
    if (Number.isFinite(n)) return negative ? -n : n;
    return null;
  }

  const lastSep = Math.max(lastDot, lastComma);
  const decimals = s.slice(lastSep + 1);
  if (decimals.length > 2) return null;

  const hasGroup = (sep) => {
    const before = s.slice(0, sep);
    const afterSep = s.slice(sep + 1);
    return (
      before.includes(',') ||
      before.includes('.') ||
      afterSep.includes(',') ||
      afterSep.includes('.')
    );
  };

  const treatAsDecimal = (sep) => decimals.length === 2 && sep === lastSep;

  let normalized;
  if (treatAsDecimal(lastDot)) {
    normalized = s.replace(/\.(?=.*\.)/g, '').replace(/,/g, '');
  } else if (treatAsDecimal(lastComma)) {
    normalized = s.replace(/,(?=.*,)/g, '').replace(/\./g, '');
  } else if (hasGroup(lastDot) || decimals.length === 2) {
    normalized = s.replace(/,/g, '');
  } else {
    normalized = s.replace(/\./g, '');
  }

  const n = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export function detectCurrency(text) {
  const match = text.match(CURRENCY_SYMBOLS);
  if (match) {
    if (CURRENCY_CODES.test(match[0])) return match[0].toUpperCase();
    return match[0];
  }
  return null;
}

export function parseLines(lines, options = {}) {
  const ops = { includeBalance: true, currency: null, ...options };
  const transactions = [];
  let currency = ops.currency;
  let current = null;

  const flush = () => {
    if (current && current.description) {
      const desc = current.description.trim();
      if (desc.length > 0 && !/^page \d+/i.test(desc) && !BALANCE_ONLY_LINES.test(desc)) {
        transactions.push(current);
      }
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    if (!currency) currency = detectCurrency(line);

    let m = null;
    for (const pattern of DATE_PATTERNS) {
      m = line.match(pattern);
      if (m) break;
    }

    if (m) {
      flush();
      const [, day, month, year] = m;
      const date = normalizeDate(day, month, year);
      if (!date) continue;

      const originalRest = line.slice(m[0].length).trim();
      let rest = originalRest;
      const amounts = [];
      let am;
      while ((am = rest.match(AMOUNT_PATTERN))) {
        amounts.push(parseAmount(am[0]));
        rest = rest.slice(am.index + am[0].length).trim();
      }

      const description = originalRest.replace(AMOUNT_PATTERN_GLOBAL, ' ').trim();

      if (amounts.length === 0 && description === '') continue;

      let amount = null;
      let balance = null;
      if (amounts.length >= 1) amount = amounts[0];
      if (amounts.length >= 2 && ops.includeBalance) balance = amounts[1];

      if (amount !== null && DEBIT_MARKERS.test(description + ' ')) {
        amount = Math.abs(amount) * -1;
      }
      if (amount !== null && CREDIT_MARKERS.test(description + ' ') && amount < 0) {
        amount = Math.abs(amount);
      }

      current = { date, description, amount, balance };
    } else if (current && amountsMatchTail(line)) {
      const amounts = [];
      const originalRest = line;
      let rest = originalRest;
      let am;
      while ((am = rest.match(AMOUNT_PATTERN))) {
        amounts.push(parseAmount(am[0]));
        rest = rest.slice(am.index + am[0].length).trim();
      }
      const desc = originalRest.replace(AMOUNT_PATTERN_GLOBAL, ' ').trim();
      if (amounts.length >= 1 && current.amount === null) {
        current.amount = amounts[0];
        current.description += ' ' + desc;
      } else if (amounts.length >= 1) {
        current.balance = amounts[0];
        if (desc) current.description += ' ' + desc;
      }
    } else if (current) {
      current.description += ' ' + line;
    }
  }
  flush();

  return { transactions, currency: currency || null };
}

function amountsMatchTail(line) {
  return AMOUNT_PATTERN.test(line) && !DATE_PATTERNS.some((p) => p.test(line));
}

export function summarize(transactions, currency) {
  let credits = 0;
  let debits = 0;
  const dateSet = new Set();
  let currencyOut = currency;

  for (const t of transactions) {
    if (t.amount === null || t.amount === undefined) continue;
    if (!currencyOut && t.description) currencyOut = detectCurrency(t.description);
    if (t.amount > 0) credits += t.amount;
    else if (t.amount < 0) debits += Math.abs(t.amount);
    if (t.date) dateSet.add(t.date);
  }

  const dates = [...dateSet].sort();
  return {
    count: transactions.length,
    credits: round2(credits),
    debits: round2(debits),
    net: round2(credits - debits),
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
    currency: currencyOut,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}