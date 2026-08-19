import { Router } from 'express';
import { hasGumroad, config } from '../config.js';

export function createLicenseRouter({ gumroad, tokenStore }) {
  const router = Router();

  router.get('/status', (req, res) => {
    const token = req.headers['x-access-token'];
    const payload = tokenStore.verifyToken(token);
    res.json({ configured: hasGumroad(), active: Boolean(payload) });
  });

  router.post('/activate', async (req, res, next) => {
    if (!gumroad) {
      return res.status(503).json({ error: 'not_configured', detail: 'Payment is not configured yet.' });
    }
    const { licenseKey } = req.body || {};
    if (typeof licenseKey !== 'string' || licenseKey.trim() === '') {
      return res.status(400).json({ error: 'missing_license_key' });
    }
    try {
      const result = await gumroad.activateLicense(licenseKey);
      const purchase = result.purchase || {};
      const token = tokenStore.issuePaidToken(purchase);
      res.json({
        ok: true,
        token,
        purchase: {
          productName: purchase.product_name || null,
          email: maskEmail(purchase.email),
          price: purchase.price || null,
          refunded: Boolean(purchase.refunded),
        },
      });
    } catch (err) {
      if (err && err.status) {
        const msg = String(err.message || 'activation_failed');
        return res.status(err.status).json({
          error: err.status === 401 ? 'invalid_license' : 'activation_failed',
          detail: err.status === 401 ? 'License key is invalid or belongs to another product.' : msg,
        });
      }
      return next(err);
    }
  });

  return router;
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}