import { test as base } from '@playwright/test';
import { Client, Pool } from 'pg';

import {
  adminUrlFrom,
  databaseNameFromUrl,
  quoteIdentifier,
  replaceDatabaseName,
} from '@/scripts/seed/lib/database';

type WorkerFixtures = {
  databaseUrl: string;
  db: Pool;
};

export const test = base.extend<object, WorkerFixtures>({
  databaseUrl: [
    async ({}, use, workerInfo) => {
      const templateUrl = process.env.E2E_TEMPLATE_DATABASE_URL?.trim();
      if (!templateUrl) {
        throw new Error(
          'E2E_TEMPLATE_DATABASE_URL is required. Run `pnpm seed:e2e` first.',
        );
      }

      const templateName = databaseNameFromUrl(templateUrl);
      const workerName = `${templateName}_w${workerInfo.workerIndex}_${Date.now()}`;
      const workerUrl = replaceDatabaseName(templateUrl, workerName);
      const adminUrl = adminUrlFrom(templateUrl);
      const client = new Client({ connectionString: adminUrl });

      await client.connect();
      try {
        await client.query(
          `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
            WHERE datname = $1
              AND pid <> pg_backend_pid()`,
          [workerName],
        );
        await client.query(
          `DROP DATABASE IF EXISTS ${quoteIdentifier(workerName)} WITH (FORCE)`,
        );
        await client.query(
          `CREATE DATABASE ${quoteIdentifier(workerName)} TEMPLATE ${quoteIdentifier(templateName)}`,
        );
      } finally {
        await client.end();
      }

      const cleanupWorkerDatabase = async () => {
        const cleanup = new Client({ connectionString: adminUrl });
        await cleanup.connect();
        try {
          await cleanup.query(
            `SELECT pg_terminate_backend(pid)
               FROM pg_stat_activity
              WHERE datname = $1
                AND pid <> pg_backend_pid()`,
            [workerName],
          );
          await cleanup.query(
            `DROP DATABASE IF EXISTS ${quoteIdentifier(workerName)} WITH (FORCE)`,
          );
        } finally {
          await cleanup.end();
        }
      };

      await use(workerUrl).finally(cleanupWorkerDatabase);
    },
    { scope: 'worker' },
  ],
  db: [
    async ({ databaseUrl }, use) => {
      const pool = new Pool({ connectionString: databaseUrl });
      await use(pool);
      await pool.end();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
