import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

describe('digest routes (2a & 2b)', () => {
  let tempRunsDir: string;
  let config: RigConfig;

  beforeAll(() => {
    tempRunsDir = mkdtempSync(join(tmpdir(), 'rig-test-runs-'));
    config = {
      adapter: 'test',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir: tempRunsDir,
    };

    // 1. Normal night (2026-10-28)
    const normalData = [
      JSON.stringify({
        at: '2026-10-28T23:00:00+01:00',
        job: 'backup',
        status: 'ok',
        owner: 'lane-07',
      }),
      JSON.stringify({
        at: '2026-10-28T23:30:00+01:00',
        job: 'sync',
        status: 'retry',
        owner: 'rook',
        error: 'timeout',
      }),
      JSON.stringify({
        at: '2026-10-28T23:31:00+01:00',
        job: 'sync',
        status: 'ok',
        owner: 'rook',
      }),
    ].join('\n');
    writeFileSync(join(tempRunsDir, '2026-10-28.jsonl'), normalData, 'utf8');

    // 2. Empty night (2026-10-29)
    writeFileSync(join(tempRunsDir, '2026-10-29.jsonl'), '', 'utf8');

    // 3. Night with a bad line (2026-10-30)
    const badLineData = [
      JSON.stringify({
        at: '2026-10-30T01:00:00+01:00',
        job: 'job-a',
        status: 'ok',
        owner: null,
      }),
      '{"at":"2026-10-30T01:01:00+01:00","job":"job-b",INVALID_JSON',
    ].join('\n');
    writeFileSync(join(tempRunsDir, '2026-10-30.jsonl'), badLineData, 'utf8');
  });

  afterAll(() => {
    rmSync(tempRunsDir, { recursive: true, force: true });
  });

  describe('200: standard night', () => {
    it('GET /digest/:night returns 200 with table and lane banner', async () => {
      process.env.LANE_MARKER = 'DIGEST-MARKER';
      const app = createApp(config);
      const res = await app.request('/digest/2026-10-28');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('DIGEST-MARKER');
      expect(html).toContain('backup');
      expect(html).toContain('sync');
      expect(html).toContain('<table>');
    });

    it('GET /api/digest/:night returns 200 with JSON rows in same order', async () => {
      const app = createApp(config);
      const res = await app.request('/api/digest/2026-10-28');
      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(rows).toHaveLength(2);
      expect(rows[0].job).toBe('backup');
      expect(rows[1].job).toBe('sync');
    });
  });

  describe('404: night with no file', () => {
    it('GET /digest/missing-night returns 404', async () => {
      const app = createApp(config);
      const res = await app.request('/digest/2025-01-01');
      expect(res.status).toBe(404);
    });

    it('GET /api/digest/missing-night returns 404', async () => {
      const app = createApp(config);
      const res = await app.request('/api/digest/2025-01-01');
      expect(res.status).toBe(404);
    });
  });

  describe('empty night', () => {
    it('GET /digest/:night renders "nothing ran"', async () => {
      const app = createApp(config);
      const res = await app.request('/digest/2026-10-29');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('nothing ran');
    });

    it('GET /api/digest/:night returns empty array []', async () => {
      const app = createApp(config);
      const res = await app.request('/api/digest/2026-10-29');
      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(rows).toEqual([]);
    });
  });

  describe('night with a bad line', () => {
    it('GET /digest/:night renders the valid jobs without throwing', async () => {
      const app = createApp(config);
      const res = await app.request('/digest/2026-10-30');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('job-a');
      expect(html).toContain('—'); // null owner
    });

    it('GET /api/digest/:night returns valid jobs', async () => {
      const app = createApp(config);
      const res = await app.request('/api/digest/2026-10-30');
      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(rows).toHaveLength(1);
      expect(rows[0].job).toBe('job-a');
      expect(rows[0].owner).toBe('—');
    });
  });
});
