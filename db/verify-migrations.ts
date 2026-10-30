import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';

import { config } from '@/config';
import { db } from '@/db';

const migrationsDir = join(process.cwd(), 'db/migrations');
const journalPath = join(migrationsDir, 'meta/_journal.json');

function fail(message: string): never {
  console.error(`migration verification failed: ${message}`);
  process.exit(1);
}

async function main() {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { tag: string }[];
  };
  const sqlFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.replace(/\.sql$/, ''))
    .sort();
  const journalTags = journal.entries.map((entry) => entry.tag);

  const missingFromJournal = sqlFiles.filter(
    (tag) => !journalTags.includes(tag),
  );
  if (missingFromJournal.length > 0)
    fail(`SQL files missing from journal: ${missingFromJournal.join(', ')}`);

  const missingFiles = journalTags.filter((tag) => !sqlFiles.includes(tag));
  if (missingFiles.length > 0)
    fail(`journal entries without SQL files: ${missingFiles.join(', ')}`);

  const extras = readFileSync(
    join(migrationsDir, '0001_postgres_extras.sql'),
    'utf8',
  );
  if (!extras.includes('CREATE EXTENSION IF NOT EXISTS btree_gist'))
    fail('0001_postgres_extras.sql must enable btree_gist');
  if (!extras.includes('DO $$'))
    fail('0001_postgres_extras.sql must use guarded DO blocks');

  const hardening = readFileSync(
    join(migrationsDir, '0008_lifecycle_hardening.sql'),
    'utf8',
  );
  if (!hardening.includes('refund_claimed_at'))
    fail('0008_lifecycle_hardening.sql must add refund worker columns');

  if (!config.DB.URL) {
    console.log(
      'migration journal verification passed (database checks skipped)',
    );
    return;
  }

  try {
    const extensions = await db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname IN ('btree_gist', 'pg_trgm', 'pgcrypto')`,
    );
    const names = new Set(
      (extensions.rows as { extname: string }[]).map((row) => row.extname),
    );
    for (const required of ['btree_gist', 'pg_trgm', 'pgcrypto']) {
      if (!names.has(required))
        fail(`database is missing extension ${required}`);
    }

    const constraints = await db.execute(
      sql`
        SELECT conname FROM pg_constraint
        WHERE conname IN ('no_overlapping_reservations', 'no_overlapping_blocks')
      `,
    );
    const constraintNames = new Set(
      (constraints.rows as { conname: string }[]).map((row) => row.conname),
    );
    for (const required of [
      'no_overlapping_reservations',
      'no_overlapping_blocks',
    ]) {
      if (!constraintNames.has(required))
        fail(`database is missing constraint ${required}`);
    }

    const refundColumns = await db.execute(
      sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name IN (
            'refund_claimed_at',
            'refund_attempts',
            'refund_last_error'
          )
      `,
    );
    const refundColumnNames = new Set(
      (refundColumns.rows as { column_name: string }[]).map(
        (row) => row.column_name,
      ),
    );
    for (const required of [
      'refund_claimed_at',
      'refund_attempts',
      'refund_last_error',
    ]) {
      if (!refundColumnNames.has(required))
        fail(`database is missing payments.${required}`);
    }
    console.log('migration journal and database verification passed');
    process.exit(0);
  } catch (error) {
    console.error('database migration verification failed');
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
