# Security Policy

## Reporting a vulnerability

Do **not** open a public issue. Email the maintainer via the contact listed on the Gumroad product page, or open a private advisory on GitHub (Security → Report a vulnerability). Please include:

- Affected endpoint/file and version
- Steps to reproduce
- Impact assessment

We aim to acknowledge reports within 48 hours and ship fixes within 7 days for high severity issues.

## Threat model

- Attackers have full control of client requests (no auth assumptions)
- Bank statements are highly sensitive: the app must never persist them
- Payment validation must happen server-side; the client is untrusted

## Hardening checklist

| Area | Control |
|---|---|
| Secrets | `.env` gitignored; `APP_SECRET` required (min 32 chars); production refuses to boot without Gumroad config; no secrets in logs |
| Upload | Magic-byte PDF validation (not extension/MIME); 10 MB cap; multer field/part limits; no user-controlled filenames (UUID) |
| PDF bombs | 250-page cap; 5M char text cap; 20 s parse timeout; memory storage only |
| Temp files | `tmp/` with 0600 mode; TTL 15 min; deleted after single download; sweeper interval |
| AuthN/AuthZ | HMAC-SHA256 signed tokens, `timingSafeEqual`; paid tokens 30-day TTL; download tokens 5-min TTL; free-tier quota via signed cookie |
| Transport/headers | Helmet: strict CSP (no inline scripts), X-Frame-Options DENY, nosniff, HSTS in production; `x-powered-by` off |
| CSRF | Origin/Referer check on all non-GET requests |
| Abuse | Rate limits: convert 20/15 min, license 30/15 min, API 120/min |
| Injection | CSP + `textContent`-only frontend (no innerHTML); XML-escaped XLSX strings; CSV quoting per RFC 4180 |
| Info leak | 500 responses never include stack traces; masked purchase emails; no statement contents in logs |
| Supply chain | `pdfjs-dist` (Mozilla) + `fflate` only for parsing/export (replaced `xlsx` which has an unfixed prototype-pollution advisory); `npm audit` clean; CI runs audit on every push |
| Deployment | Docker runs as non-root user; healthcheck; graceful shutdown on SIGTERM/SIGINT |

## Running your own audit

```bash
npm audit --audit-level=high   # dependency audit
npm test                       # 56 unit + integration tests (incl. forged tokens, CSRF, magic-byte rejection)
```

## Bug bounty

This project is a solo micro-SaaS; no bounty program is offered. Responsible disclosure is appreciated.