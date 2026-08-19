import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { TokenStore } from '../src/services/store.js';
import { assertPdf } from '../src/middleware/upload.js';

const SECRET = 'x'.repeat(64);
const store = () => new TokenStore(SECRET);

test('tokenStore requires long secret', () => {
  assert.throws(() => new TokenStore('short'));
});

test('paid token verifies round-trip', () => {
  const s = store();
  const token = s.issuePaidToken({ id: 'purchase-1' });
  const payload = s.verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.kind, 'paid');
});

test('forged token is rejected', () => {
  const s = store();
  const token = s.issuePaidToken({ id: 'purchase-1' });
  const forged = token.slice(0, -4) + 'AAAA';
  assert.equal(s.verifyToken(forged), null);
});

test('tampered payload is rejected', () => {
  const s = store();
  const token = s.issuePaidToken({ id: 'purchase-1' });
  const dot = token.lastIndexOf('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ v: 1, kind: 'paid', sub: 'purchase-9', exp: Date.now() + 9999999 }),
    'utf8'
  ).toString('base64url');
  const forged = tamperedPayload + '.' + token.slice(dot + 1);
  assert.equal(s.verifyToken(forged), null);
});

test('expired token is rejected', () => {
  const s = new TokenStore(SECRET);
  const expiredPayload = Buffer.from(
    JSON.stringify({ v: 1, kind: 'paid', sub: 'x', exp: Date.now() - 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET)
    .update(expiredPayload)
    .digest('base64url');
  assert.equal(s.verifyToken(`${expiredPayload}.${sig}`), null);
});

test('free quota allows first use, blocks second', () => {
  const s = store();
  assert.equal(s.canUseFree(undefined), true);
  const cookie = s.issueFreeCookie();
  assert.equal(s.canUseFree(cookie), false);
});

test('free cookie from another secret is rejected', () => {
  const s1 = store();
  const s2 = new TokenStore('y'.repeat(64));
  const cookie = s1.issueFreeCookie();
  assert.ok(s1.parseFree(cookie));
  assert.equal(s2.parseFree(cookie), null);
});

test('download token is single-purpose', () => {
  const s = store();
  const token = s.issueDownloadToken('file-123');
  assert.equal(s.verifyDownloadToken(token), 'file-123');
  assert.equal(s.verifyToken(token), null);
});

test('download token expires', () => {
  const s = store();
  const payload = Buffer.from(
    JSON.stringify({ v: 1, kind: 'dl', file: 'f', exp: Date.now() - 1000 }),
    'utf8'
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');
  assert.equal(s.verifyDownloadToken(`${payload}.${sig}`), null);
});

test('magic byte check accepts real PDF, rejects others', () => {
  assert.equal(assertPdf(Buffer.from('%PDF-1.4 ...')), true);
  assert.equal(assertPdf(Buffer.from('PK\x03\x04...')), false);
  assert.equal(assertPdf(Buffer.from('GIF89a...')), false);
  assert.equal(assertPdf(Buffer.from('%PDF')), false);
  assert.equal(assertPdf(null), false);
});