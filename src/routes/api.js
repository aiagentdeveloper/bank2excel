import { Router } from 'express';
import { extractPdfText } from '../services/pdfParser.js';
import { parseLines, summarize } from '../services/transactionParser.js';
import { toCsvBuffer, toXlsxBuffer } from '../services/exporter.js';
import { upload, validatePdf } from '../middleware/upload.js';
import { convertLimiter } from '../middleware/rateLimit.js';

const FREE_QUOTA = 1;
const FREE_COOKIE = 'b2e_free';

export function createApiRouter({ tempStore, tokenStore, checkAccess, setFreeCookie }) {
  const router = Router();

  router.get('/config', (req, res) => {
    res.json({ freeQuota: FREE_QUOTA, maxPages: 250 });
  });

  router.post('/convert', convertLimiter, upload.single('file'), validatePdf, checkAccess, async (req, res, next) => {
    try {
      const buffer = req.file.buffer;
      const text = await extractPdfText(buffer);

      const lines = text.split(/\r?\n/);
      const { transactions, currency } = parseLines(lines);
      if (transactions.length === 0) {
        return res.status(422).json({
          error: 'no_transactions',
          detail: 'No transactions detected. This statement format may not be supported yet.',
        });
      }

      const summary = summarize(transactions, currency);

      const headers = ['Date', 'Description', 'Amount', 'Balance'];
      const rows = transactions.map((t) => [
        t.date || '',
        t.description || '',
        t.amount === null || t.amount === undefined ? '' : t.amount,
        t.balance === null || t.balance === undefined ? '' : t.balance,
      ]);

      const csvId = tempStore.create(toCsvBuffer(headers, rows), 'csv');
      const xlsxId = tempStore.create(toXlsxBuffer(headers, rows), 'xlsx');

      setFreeCookie(req, res);

      res.json({
        ok: true,
        summary,
        files: {
          csv: { id: csvId, token: tokenStore.issueDownloadToken(csvId) },
          xlsx: { id: xlsxId, token: tokenStore.issueDownloadToken(xlsxId) },
        },
        note: 'Files are deleted automatically after 15 minutes.',
      });
    } catch (err) {
      const code = String(err && err.message ? err.message : '');
      const known = [
        'invalid_file',
        'file_too_large',
        'too_many_pages',
        'parse_timeout',
        'file_too_complex',
        'no_text_layer',
      ];
      if (known.includes(code)) {
        return res.status(422).json({ error: code });
      }
      return next(err);
    }
  });

  router.get('/download/:id', (req, res) => {
    const { id } = req.params;
    const token = req.query.t;
    if (!id || typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    const fileId = tokenStore.verifyDownloadToken(token);
    if (fileId !== id) {
      return res.status(403).json({ error: 'invalid_token' });
    }
    const path = tempStore.get(id);
    if (!path) {
      return res.status(410).json({ error: 'expired', detail: 'File expired or was already downloaded.' });
    }
    const format = path.endsWith('.xlsx') ? 'xlsx' : 'csv';
    res.download(path, `bank-statement.${format}`, (err) => {
      tempStore.remove(id);
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'download_failed' });
      }
    });
  });

  return router;
}

export function makeAccessControl({ tokenStore, checkoutUrl }) {
  return function checkAccess(req, res, next) {
    const accessToken = req.headers['x-access-token'];
    if (accessToken) {
      if (!tokenStore.verifyToken(accessToken)) {
        return res.status(403).json({ error: 'invalid_access_token' });
      }
      req.access = { type: 'paid' };
      return next();
    }

    const freeCookie = req.cookies && req.cookies[FREE_COOKIE];
    if (tokenStore.canUseFree(freeCookie)) {
      req.access = { type: 'free' };
      return next();
    }

    const body = {
      error: 'license_required',
      detail: 'Free trial used. Purchase a license to continue converting.',
    };
    if (checkoutUrl) body.checkoutUrl = checkoutUrl;
    return res.status(402).json(body);
  };
}

export function makeSetFreeCookie(tokenStore) {
  return function setFreeCookie(req, res) {
    if (req.access && req.access.type === 'free') {
      res.cookie(FREE_COOKIE, tokenStore.issueFreeCookie(), {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }
  };
}