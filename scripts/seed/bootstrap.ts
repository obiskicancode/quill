import { db } from '@/db';

import { runBootstrap } from './lib/bootstrap';

async function main(): Promise<void> {
  const result = await db.transaction((tx) =>
    runBootstrap({ executor: tx, now: new Date() }),
  );
  console.log(
    `Bootstrap complete. Settings ${result.settingsCreated ? 'created' : 'already present'}; owner ${result.ownerCreated ? 'created' : 'already present'}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
