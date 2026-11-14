import { db } from '@/db';

import { requiredEnv } from './lib/args';
import { assertDemoAllowed, assertNotProduction } from './lib/guards';
import { runResetDemo } from './lib/reset-demo';

async function main(): Promise<void> {
  assertNotProduction();
  const databaseUrl = requiredEnv('DATABASE_URL');
  assertDemoAllowed({
    databaseUrl,
    allowlist: process.env.DEMO_DB_HOST_ALLOWLIST,
  });

  const result = await db.transaction((tx) => runResetDemo(tx));
  console.log(
    `Demo reset complete: removed ${result.records} tracked rows across ${result.tables} tables.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
