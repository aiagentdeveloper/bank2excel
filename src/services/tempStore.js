import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const DIR = join(process.cwd(), 'tmp');

export class TempStore {
  constructor({ ttlMs = 15 * 60 * 1000, sweepIntervalMs = 5 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.entries = new Map();
    mkdirSync(DIR, { recursive: true });
    this.timer = setInterval(() => this.sweep(), sweepIntervalMs);
    this.timer.unref();
  }

  create(buffer, ext) {
    const id = randomUUID();
    const filename = `${id}.${ext}`;
    writeFileSync(join(DIR, filename), buffer, { flag: 'wx', mode: 0o600 });
    this.entries.set(id, { filename, expires: Date.now() + this.ttlMs });
    return id;
  }

  get(id) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.remove(id);
      return null;
    }
    return join(DIR, entry.filename);
  }

  remove(id) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    try {
      rmSync(join(DIR, entry.filename), { force: true });
    } catch {
      /* best effort */
    }
  }

  sweep() {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (entry.expires < now) this.remove(id);
    }
  }

  destroy() {
    clearInterval(this.timer);
    this.sweep();
  }
}

export function tempDirExists() {
  return existsSync(DIR);
}