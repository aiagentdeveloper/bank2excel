import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildApp } from '../src/server.js';
import { TokenStore } from '../src/services/store.js';

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

const mockGumroad = {
  activateLicense: async (key) => {
    if (key !== 'VALID-KEY-123') throw Object.assign(new Error('license key invalid'), { status: 401 });
    return {
      purchase: {
        id: 'purchase-42',
        product_name: 'Bank2Excel',
        email: 'buyer@example.com',
        price: 9,
      },
    };
  },
};

let server;
let base;

before(async () => {
  const { app } = buildApp({
    tokenStore: new TokenStore(SECRET),
    gumroad: mockGumroad,
  });
  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

function makePdfForm() {
  const form = new FormData();
  form.append('file', new Blob([readFileSync('tmp/sample-statement.pdf')], { type: 'application/pdf' }), 'statement.pdf');
  return form;
}

test('health endpoint responds', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('static index page served with CSP headers', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const csp = res.headers.get('content-security-policy');
  assert.ok(csp && csp.includes("default-src 'self'"));
  assert.ok(csp && csp.includes("object-src 'none'"));
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.ok(res.headers.get('x-content-type-options'));
  assert.ok(res.headers.get('x-frame-options'));
});

test('rejects non-PDF uploads', async () => {
  const form = new FormData();
  form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'evil.txt');
  const res = await fetch(`${base}/api/convert`, { method: 'POST', body: form });
  assert.equal(res.status, 400);
});

test('rejects files that are not actually PDFs', async () => {
  const form = new FormData();
  form.append('file', new Blob(['PK\x03\x04 not a zip pdf'], { type: 'application/pdf' }), 'fake.pdf');
  const res = await fetch(`${base}/api/convert`, { method: 'POST', body: form });
  assert.equal(res.status, 400);
});

test('rejects requests with no file', async () => {
  const form = new FormData();
  const res = await fetch(`${base}/api/convert`, { method: 'POST', body: form });
  assert.equal(res.status, 400);
});

test('blocks cross-origin form posts (CSRF defense)', async () => {
  const form = makePdfForm();
  const res = await fetch(`${base}/api/convert`, {
    method: 'POST',
    body: form,
    headers: { Origin: 'https://evil.example.com' },
  });
  assert.equal(res.status, 403);
});

test('free tier: first conversion works and sets quota cookie', async () => {
  const res = await fetch(`${base}/api/convert`, { method: 'POST', body: makePdfForm() });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.summary.count, 8);
  assert.ok(body.files.csv.token);
  assert.ok(body.files.xlsx.token);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('b2e_free'));
});

test('free tier: second conversion is blocked with 402', async () => {
  const first = await fetch(`${base}/api/convert`, { method: 'POST', body: makePdfForm() });
  const cookie = first.headers.get('set-cookie').split(';')[0];
  const second = await fetch(`${base}/api/convert`, {
    method: 'POST',
    body: makePdfForm(),
    headers: { Cookie: cookie },
  });
  assert.equal(second.status, 402);
  const body = await second.json();
  assert.equal(body.error, 'license_required');
});

test('license activation with valid key returns token', async () => {
  const res = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: 'VALID-KEY-123' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.token);
  assert.equal(body.purchase.productName, 'Bank2Excel');
  assert.ok(body.purchase.email.includes('*'));
});

test('license activation with invalid key is rejected', async () => {
  const res = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: 'BAD-KEY' }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'invalid_license');
});

test('license activation with missing key is rejected', async () => {
  const res = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test('paid conversion works with access token and returns file', async () => {
  const lic = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: 'VALID-KEY-123' }),
  });
  const { token } = await lic.json();

  const res = await fetch(`${base}/api/convert`, {
    method: 'POST',
    body: makePdfForm(),
    headers: { 'X-Access-Token': token },
  });
  assert.equal(res.status, 200);
  const body = await res.json();

  const csv = await fetch(`${base}/api/download/${body.files.csv.id}?t=${encodeURIComponent(body.files.csv.token)}`);
  assert.equal(csv.status, 200);
  const csvBytes = new Uint8Array(await csv.arrayBuffer());
  assert.equal(csvBytes[0], 0xef);
  assert.equal(csvBytes[1], 0xbb);
  assert.equal(csvBytes[2], 0xbf);
  const csvText = new TextDecoder('utf-8').decode(csvBytes);
  assert.ok(csvText.includes('Date,Description,Amount,Balance'));
  assert.ok(csvText.includes('SALARY ACME CORP'));
});

test('download with invalid token is rejected', async () => {
  const res = await fetch(`${base}/api/download/00000000-0000-0000-0000-000000000000?t=forged`);
  assert.equal(res.status, 403);
});

test('download is single use', async () => {
  const lic = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: 'VALID-KEY-123' }),
  });
  const { token } = await lic.json();
  const conv = await fetch(`${base}/api/convert`, {
    method: 'POST',
    body: makePdfForm(),
    headers: { 'X-Access-Token': token },
  });
  const body = await conv.json();
  const url = `${base}/api/download/${body.files.xlsx.id}?t=${encodeURIComponent(body.files.xlsx.token)}`;
  const first = await fetch(url);
  assert.equal(first.status, 200);
  const second = await fetch(url);
  assert.equal(second.status, 410);
});

test('invalid access token is rejected', async () => {
  const res = await fetch(`${base}/api/convert`, {
    method: 'POST',
    body: makePdfForm(),
    headers: { 'X-Access-Token': 'forged.token.value' },
  });
  assert.equal(res.status, 403);
});

test('unknown routes return 404 JSON', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
});

test('JSON body limit rejects oversized bodies', async () => {
  const res = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: 'x'.repeat(100000) }),
  });
  assert.equal(res.status, 413);
});