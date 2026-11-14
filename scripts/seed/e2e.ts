import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { requiredEnv } from './lib/args';
import { runBootstrap } from './lib/bootstrap';
import {
  adminUrlFrom,
  createDatabase,
  databaseNameFromUrl,
  dropDatabase,
  replaceDatabaseName,
  runMigrations,
} from './lib/database';
import { runE2EData } from './lib/e2e-data';
import { assertNotProduction } from './lib/guards';

process.env.NOTIFICATION_RECIPIENT_EMAIL ??= 'e2e@example.test';
process.env.OWNER_EMAIL ??= 'e2e.owner@example.test';
process.env.OWNER_PASSWORD ??= 'E2eOwner!Passw0rd';
process.env.OWNER_FIRST_NAME ??= 'E2E';
process.env.OWNER_LAST_NAME ??= 'Owner';

function templateUrlFor(baseUrl: string): string {
  if (process.env.E2E_TEMPLATE_DATABASE_URL?.trim()) {
    return process.env.E2E_TEMPLATE_DATABASE_URL.trim();
  }
  return replaceDatabaseName(
    baseUrl,
    `${databaseNameFromUrl(baseUrl)}_e2e_template`,
  );
}

async function main(): Promise<void> {
  assertNotProduction();
  const baseUrl = requiredEnv('DATABASE_URL');
  const templateUrl = templateUrlFor(baseUrl);
  const templateName = databaseNameFromUrl(templateUrl);
  if (templateName === databaseNameFromUrl(baseUrl)) {
    throw new Error(
      'E2E_TEMPLATE_DATABASE_URL must point to a separate template database, not DATABASE_URL.',
    );
  }
  const adminUrl = adminUrlFrom(templateUrl);

  console.log(`Recreating E2E template database ${templateName}...`);
  await dropDatabase(adminUrl, templateName);
  await createDatabase(adminUrl, templateName);
  await runMigrations(templateUrl);

  const pool = new Pool({ connectionString: templateUrl });
  try {
    const templateDb = drizzle(pool);
    await templateDb.transaction(async (tx) => {
      await runBootstrap({ executor: tx, now: new Date() });
      await runE2EData(tx, new Date());
    });
  } finally {
    await pool.end();
  }

  console.log(`E2E template ready: ${templateUrl}`);
  console.log('Set E2E_TEMPLATE_DATABASE_URL to this value for Playwright.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
