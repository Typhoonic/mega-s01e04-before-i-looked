import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('run log reader', () => {
  it('reads runs/2026-10-28.jsonl with 5 jobs and 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    if (!digest) return;

    expect(digest.badLines).toBe(1);
    expect(digest.rows).toHaveLength(5);
    expect(digest).toHaveLength(5);

    const jobs = digest.rows.map((r) => r.job);
    expect(jobs).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    // Check null owner -> '—'
    const digestRender = digest.rows.find((r) => r.job === 'digest/render');
    expect(digestRender?.owner).toBe('—');
    expect(digestRender?.runs).toBe(1);
    expect(digestRender?.retries).toBe(0);
    expect(digestRender?.lastStatus).toBe('ok');
    expect(digestRender?.lastError).toBeNull();

    // Check fixtures/refresh: 4 runs, 3 retries, last status ok, last error upstream 503
    const fixturesRefresh = digest.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixturesRefresh?.owner).toBe('rook');
    expect(fixturesRefresh?.runs).toBe(4);
    expect(fixturesRefresh?.retries).toBe(3);
    expect(fixturesRefresh?.lastStatus).toBe('ok');
    expect(fixturesRefresh?.lastError).toBe('upstream 503');

    // Check notes/backup: 1 run, 0 retries, last status fail, last error quota exceeded
    const notesBackup = digest.rows.find((r) => r.job === 'notes/backup');
    expect(notesBackup?.owner).toBe('lane-07');
    expect(notesBackup?.runs).toBe(1);
    expect(notesBackup?.retries).toBe(0);
    expect(notesBackup?.lastStatus).toBe('fail');
    expect(notesBackup?.lastError).toBe('quota exceeded');
  });

  it('returns null for nonexistent night', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
