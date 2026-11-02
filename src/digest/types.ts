export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
  status?: JobStatus;
  error?: string | null;
  first?: string;
  last?: string;
};

export type NightDigest = DigestRow[] & {
  night: string;
  rows: DigestRow[];
  badLines: number;
  counts: {
    ok: number;
    retry: number;
    fail: number;
  };
};

export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
