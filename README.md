# Bank2Excel — PDF Bank Statements → Excel/CSV

Convert PDF bank statements to Excel (XLSX) and CSV in seconds. No account, no signup, privacy-first: files are processed in memory and deleted within 15 minutes.

Built as a solo-founder micro-SaaS in the proven "boring niche tool" category (Starter Story pattern: PDF bank statement converter — $40K/mo comparable, $100 to start, 14-day build).

## Features

- Automatic transaction extraction: dates, descriptions, amounts, running balances
- Handles multiple date formats (`DD/MM/YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`, 2-digit years)
- Handles US (`1,234.56`) and EU (`1.234,56`) number formats, parenthesis negatives, `DR/CR` markers
- Multi-line descriptions merged automatically
- Summary: total credits, debits, net, date range, currency detection
- CSV (Excel-ready, UTF-8 BOM) and real XLSX export (hand-rolled writer, zero vulnerable dependencies)
- Gumroad license-key paywall: 1 free conversion/day, lifetime license for $9
- Multi-page statements up to 250 pages, 10 MB max

## Tech stack

Node.js 24 + Express 4, `pdfjs-dist` (Mozilla PDF.js) for extraction, `fflate` for XLSX zip, Helmet + rate limiting + signed HMAC tokens. Zero native dependencies.

## Quick start

```bash
cp .env.example .env   # set APP_SECRET (openssl rand -hex 32)
npm install
npm run make:sample    # generates tmp/sample-statement.pdf for testing
npm test               # 56 tests
npm run dev            # http://localhost:3000
```

## Gumroad setup (payments)

1. Gumroad → Products → create a **License Key** product (type "license key" when asked what you're selling)
2. Price: $9 one-time. Copy the product permalink (e.g. `bank2excel`)
3. Gumroad → Settings → Advanced → API → create access token
4. Fill `.env`:

```env
GUMROAD_ACCESS_TOKEN=<token>
GUMROAD_PRODUCT_ID=<permalink>
GUMROAD_CHECKOUT_URL=https://<yourname>.gumroad.com/l/<permalink>
```

The app verifies license keys server-side against the Gumroad API (with a 6-hour cache) and issues a 30-day signed access token.

## Deploy (Render, free tier)

1. Push this repo to GitHub
2. Render → New → Web Service → connect repo
3. Build command: `npm ci --omit=dev`  — Start command: `node src/server.js`
4. Environment variables: copy all from `.env.example` (set `NODE_ENV=production`, `TRUST_PROXY=true`)
5. Health check path: `/health`

Or Docker: `docker build -t bank2excel . && docker run -p 3000:3000 --env-file .env bank2excel`

## Security

See [SECURITY.md](SECURITY.md) for the full hardening list. Highlights:

- No secrets in the repo; `.env` is gitignored, config validated at boot (production refuses to start without Gumroad config)
- Uploads validated by magic bytes (`%PDF-`), not file extension; 10 MB cap
- PDF bombs: 250-page limit, 5M char text cap, 20 s parse timeout
- Temp files: random UUID names, 600 permissions, auto-deleted after download or 15 minutes
- All tokens HMAC-SHA256 signed with timing-safe comparison; 30-day paid tokens, 5-minute download tokens
- Helmet CSP (no inline scripts), CSRF origin checks, rate limiting on all API routes
- Frontend uses `textContent` only (no innerHTML injection), strict CSP
- `npm audit` clean (0 vulnerabilities); CI runs tests + audit on every push
- Non-root user in Dockerfile

## Project structure

```
src/
  server.js              # app wiring, boot, graceful shutdown
  config.js              # env loading + validation
  routes/api.js          # convert, download, config
  routes/license.js      # Gumroad license activation
  services/pdfParser.js  # pdfjs text extraction (line reconstruction)
  services/transactionParser.js  # regex/heuristic transaction parser
  services/exporter.js   # CSV + hand-rolled XLSX writer
  services/gumroad.js    # Gumroad API client (cache + timeouts)
  services/store.js      # signed tokens, free-tier quota
  services/tempStore.js  # TTL temp file store
  middleware/            # rate limits, upload validation, security
public/                  # landing page + converter UI
test/                    # 56 unit + integration tests
scripts/make-sample-pdf.js
```

## Known limitations

- Text-based statements only (scanned/image PDFs return a clear error — OCR is a planned upgrade)
- Day-first date ordering assumed (EU convention); MM/DD layouts may misparse
- Column layouts vary by bank; the parser covers common patterns and rejects unknown ones instead of guessing

## License

MIT — see [LICENSE](LICENSE).