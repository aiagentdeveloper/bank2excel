export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file_too_large', detail: 'PDF must be under 10 MB.' });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'invalid_upload', detail: err.code });
  }
  if (err && err.name === 'EntityTooLarge') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  if (err && err.message === 'invalid_type') {
    return res.status(400).json({ error: 'invalid_type', detail: 'Only PDF files are accepted.' });
  }
  if (err && err.message === 'missing_file') {
    return res.status(400).json({ error: 'no_file', detail: 'PDF file required.' });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(`[error] ${err.message}`);
  }

  const body = { error: 'server_error' };
  if (status < 500) {
    body.error = err.message || 'bad_request';
    if (err.detail) body.detail = err.detail;
  }
  res.status(status).json(body);
}

export function csrfProtection(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return next();
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.host || '';
    if (originHost !== host) {
      return res.status(403).json({ error: 'cross_origin_rejected' });
    }
  } catch {
    return res.status(403).json({ error: 'invalid_origin' });
  }
  next();
}