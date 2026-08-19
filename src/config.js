import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const config = {
  port: Number(optional('PORT', '3000')),
  nodeEnv: optional('NODE_ENV', 'development'),
  appSecret: required('APP_SECRET'),
  gumroadToken: optional('GUMROAD_ACCESS_TOKEN'),
  gumroadProductId: optional('GUMROAD_PRODUCT_ID'),
  gumroadApiBase: optional('GUMROAD_API_BASE', 'https://api.gumroad.com/v2'),
  gumroadCheckoutUrl: optional('GUMROAD_CHECKOUT_URL'),
  maxUploadBytes: Number(optional('MAX_UPLOAD_BYTES', String(10 * 1024 * 1024))),
  tempTtlMs: Number(optional('TEMP_TTL_MS', String(15 * 60 * 1000))),
  trustProxy: optional('TRUST_PROXY', 'false') === 'true',
};

export function validateConfig() {
  if (!config.gumroadToken || !config.gumroadProductId) {
    throw new Error(
      'Gumroad is not configured: set GUMROAD_ACCESS_TOKEN and GUMROAD_PRODUCT_ID. ' +
        'Without them the license endpoints are disabled.'
    );
  }
}

export const hasGumroad = () =>
  Boolean(config.gumroadToken && config.gumroadProductId);