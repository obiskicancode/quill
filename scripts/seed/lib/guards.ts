import { DEMO_OVERRIDE_FLAG, hasFlag } from './args';

export interface DemoGuardInput {
  nodeEnv?: string;
  databaseUrl: string;
  allowlist?: string;
  argv?: string[];
}

export interface DemoGuardResult {
  host: string;
  viaOverrideFlag: boolean;
}

export function databaseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL');
  }
}

export function parseHostAllowlist(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function matchesAllowlist(host: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => {
    if (entry === host) return true;
    if (entry.startsWith('[') && entry.endsWith(']')) return entry === host;
    return entry.split(':')[0] === host;
  });
}

export function assertNotProduction(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === 'production') {
    throw new Error(
      'Refusing to run: demo and E2E seed data are never allowed when NODE_ENV=production.',
    );
  }
}

export function assertDemoAllowed(input: DemoGuardInput): DemoGuardResult {
  const host = databaseHost(input.databaseUrl);
  assertNotProduction(input.nodeEnv ?? process.env.NODE_ENV);

  const allowlist = parseHostAllowlist(input.allowlist);
  if (matchesAllowlist(host, allowlist)) {
    return { host, viaOverrideFlag: false };
  }

  if (hasFlag(input.argv ?? [], DEMO_OVERRIDE_FLAG)) {
    console.warn(
      `\n*** WARNING: ${DEMO_OVERRIDE_FLAG} bypassed DEMO_DB_HOST_ALLOWLIST for ${host}. ***\n` +
        '*** This will write fake demo data to that database. ***\n',
    );
    return { host, viaOverrideFlag: true };
  }

  throw new Error(
    `Refusing to seed demo data on database host "${host}". ` +
      `Add it to DEMO_DB_HOST_ALLOWLIST or pass ${DEMO_OVERRIDE_FLAG} on a non-production host.`,
  );
}
