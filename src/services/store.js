import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FREE_QUOTA = 1;
const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;

function sign(payloadB64, secret) {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function encodePayload(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

function decodePayload(b64) {
  const buf = Buffer.from(b64, 'base64url');
  return JSON.parse(buf.toString('utf8'));
}

export class TokenStore {
  constructor(secret) {
    if (!secret || secret.length < 32) {
      throw new Error('APP_SECRET must be at least 32 characters');
    }
    this.secret = secret;
  }

  issuePaidToken(purchase) {
    const payload = encodePayload({
      v: 1,
      kind: 'paid',
      sub: String(purchase.id || purchase.product_name || 'purchase'),
      exp: Date.now() + TOKEN_TTL_MS,
    });
    return `${payload}.${sign(payload, this.secret)}`;
  }

  verifyToken(token) {
    if (typeof token !== 'string') return null;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(payloadB64, this.secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let payload;
    try {
      payload = decodePayload(payloadB64);
    } catch {
      return null;
    }
    if (payload.v !== 1 || payload.kind !== 'paid') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  }

  canUseFree(header) {
    const parsed = this.parseFree(header);
    if (!parsed) return true;
    return parsed.count < FREE_QUOTA && parsed.iat + FREE_WINDOW_MS > Date.now();
  }

  issueFreeCookie() {
    const payload = encodePayload({
      v: 1,
      kind: 'free',
      count: FREE_QUOTA,
      iat: Date.now(),
    });
    return `${payload}.${sign(payload, this.secret)}`;
  }

  parseFree(header) {
    if (!header || typeof header !== 'string') return null;
    const dot = header.lastIndexOf('.');
    if (dot <= 0) return null;
    const payloadB64 = header.slice(0, dot);
    const sig = header.slice(dot + 1);
    const expected = sign(payloadB64, this.secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      return decodePayload(payloadB64);
    } catch {
      return null;
    }
  }

  issueDownloadToken(fileId) {
    const payload = encodePayload({
      v: 1,
      kind: 'dl',
      file: String(fileId),
      exp: Date.now() + 5 * 60 * 1000,
    });
    return `${payload}.${sign(payload, this.secret)}`;
  }

  verifyDownloadToken(token) {
    const payload = this.verifyTokenLike(token, 'dl');
    return payload ? payload.file : null;
  }

  verifyTokenLike(token, kind) {
    if (typeof token !== 'string') return null;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(payloadB64, this.secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let payload;
    try {
      payload = decodePayload(payloadB64);
    } catch {
      return null;
    }
    if (payload.v !== 1 || payload.kind !== kind) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  }

  issueNonce() {
    return randomBytes(16).toString('hex');
  }
}