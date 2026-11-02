import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DigestRow, JobStatus, NightDigest } from './types.js';

type RawLogEntry = {
  at?: unknown;
  job?: unknown;
  status?: unknown;
  owner?: unknown;
  error?: unknown;
};

export function readNight(runsDir: string, night: string): NightDigest | null {
  const filePath = resolve(runsDir, `${night}.jsonl`);
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf8');
  if (!content.trim()) {
    const emptyRows: DigestRow[] = [];
    return Object.assign(emptyRows, {
      night,
      rows: emptyRows,
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let badLines = 0;

  const jobMap = new Map<
    string,
    {
      job: string;
      owner: string;
      runs: number;
      retries: number;
      lastStatus: JobStatus;
      lastError: string | null;
      firstTime: string;
      lastTime: string;
    }
  >();

  for (const line of lines) {
    let entry: RawLogEntry;
    try {
      entry = JSON.parse(line);
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.at !== 'string' ||
        typeof entry.job !== 'string' ||
        typeof entry.status !== 'string'
      ) {
        badLines++;
        continue;
      }
    } catch {
      badLines++;
      continue;
    }

    const jobName = entry.job;
    const isRetry = entry.status === 'retry';
    const entryOwner = entry.owner ? String(entry.owner) : '—';
    const existing = jobMap.get(jobName);

    if (!existing) {
      jobMap.set(jobName, {
        job: jobName,
        owner: entryOwner,
        runs: 1,
        retries: isRetry ? 1 : 0,
        lastStatus: entry.status as JobStatus,
        lastError: entry.error ? String(entry.error) : null,
        firstTime: entry.at,
        lastTime: entry.at,
      });
    } else {
      existing.runs += 1;
      if (isRetry) {
        existing.retries += 1;
      }
      existing.lastStatus = entry.status as JobStatus;
      if (entry.error) {
        existing.lastError = String(entry.error);
      }
      if (entry.owner && existing.owner === '—') {
        existing.owner = String(entry.owner);
      }
      existing.lastTime = entry.at;
    }
  }

  const rows: DigestRow[] = Array.from(jobMap.values())
    .map((r) => ({
      ...r,
      status: r.lastStatus,
      error: r.lastError,
      first: r.firstTime,
      last: r.lastTime,
    }))
    .sort((a, b) => a.job.localeCompare(b.job));

  const counts = {
    ok: rows.filter((r) => r.lastStatus === 'ok').length,
    retry: rows.filter((r) => r.retries > 0).length,
    fail: rows.filter((r) => r.lastStatus === 'fail').length,
  };

  return Object.assign(rows, {
    night,
    rows,
    badLines,
    counts,
  });
}
