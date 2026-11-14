import { db } from '@/db';

import { requiredEnv } from './lib/args';
import { runDemo } from './lib/demo';
import { removeDemoImages } from './lib/demo-images';
import { seedNow, seedRandomSeed } from './lib/deterministic';
import { assertDemoAllowed, assertNotProduction } from './lib/guards';

async function main(): Promise<void> {
  assertNotProduction();
  const databaseUrl = requiredEnv('DATABASE_URL');
  assertDemoAllowed({
    databaseUrl,
    allowlist: process.env.DEMO_DB_HOST_ALLOWLIST,
  });

  const result = await db.transaction((tx) =>
    runDemo({
      executor: tx,
      now: seedNow(),
      randomSeed: seedRandomSeed(),
    }),
  );

  console.log(
    `Demo seed complete: ${result.reservations} reservations, ${result.enquiries} enquiries, ${result.gallery} gallery images.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    await removeDemoImages().catch(() => undefined);
    console.error(error);
    process.exit(1);
  });
