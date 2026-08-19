const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export class GumroadError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GumroadError';
    this.status = status;
  }
}

export class GumroadClient {
  constructor({ token, productId, apiBase = 'https://api.gumroad.com/v2', fetchImpl = fetch }) {
    if (!token || !productId) {
      throw new Error('Gumroad token and productId are required');
    }
    this.token = token;
    this.productId = productId;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.cache = new Map();
  }

  async verifyLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.length > 128) {
      throw new GumroadError('invalid_license_key', 400);
    }
    const key = licenseKey.trim();

    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.data, fromCache: true };
    }

    const data = await this._post('/licenses/verify', { license_key: key });
    this.cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
    return { ...data, fromCache: false };
  }

  async activateLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.length > 128) {
      throw new GumroadError('invalid_license_key', 400);
    }
    const key = licenseKey.trim();
    const data = await this._post('/licenses/activate', {
      license_key: key,
      increment_uses_count: 'false',
    });
    this.cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  }

  async _post(path, params) {
    const body = new URLSearchParams({
      access_token: this.token,
      product_id: this.productId,
      ...params,
    });

    let res;
    try {
      res = await Promise.race([
        this.fetchImpl(`${this.apiBase}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new GumroadError('gumroad_timeout', 504)), REQUEST_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      if (err instanceof GumroadError) throw err;
      throw new GumroadError('gumroad_unreachable', 502);
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new GumroadError('gumroad_bad_response', 502);
    }

    if (!json || json.success !== true) {
      const msg = json && json.message ? json.message : 'gumroad_rejected';
      throw new GumroadError(String(msg).slice(0, 200), 401);
    }
    return json;
  }
}