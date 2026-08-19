import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).toString();

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const standardFontDataUrl = pathToFileURL(join(pdfjsRoot, 'standard_fonts')) + '/';

const MAX_PAGES = 250;
const MAX_TEXT_CHARS = 5_000_000;
const PARSE_TIMEOUT_MS = 20_000;

export async function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('invalid_file');
  }
  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error('file_too_large');
  }

  const doc = await withTimeout(
    getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      standardFontDataUrl,
    }).promise,
    PARSE_TIMEOUT_MS,
    'parse_timeout'
  );

  try {
    if (doc.numPages > MAX_PAGES) {
      throw new Error('too_many_pages');
    }

    const pageTexts = [];
    let totalChars = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await withTimeout(doc.getPage(i), PARSE_TIMEOUT_MS, 'parse_timeout');
      const content = await withTimeout(
        page.getTextContent({ disableNormalization: false }),
        PARSE_TIMEOUT_MS,
        'parse_timeout'
      );
      const text = rebuildLines(content.items);
      totalChars += text.length;
      if (totalChars > MAX_TEXT_CHARS) {
        throw new Error('file_too_complex');
      }
      pageTexts.push(text);
      page.cleanup();
    }

    const text = pageTexts.join('\n');
    if (text.trim().length < 10) {
      throw new Error('no_text_layer');
    }
    return text;
  } finally {
    await doc.destroy().catch(() => {});
  }
}

function rebuildLines(items) {
  const rows = new Map();
  for (const item of items) {
    if (typeof item.str !== 'string' || item.str.length === 0) continue;
    if (!Array.isArray(item.transform) || item.transform.length < 6) continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x, str: item.str });
  }

  const ys = [...rows.keys()].sort((a, b) => b - a);
  return ys
    .map((y) =>
      rows
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((c) => c.str)
        .join(' ')
    )
    .join('\n');
}

function withTimeout(promise, ms, code) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}