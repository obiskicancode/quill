import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  adminUrlFrom,
  createDatabase,
  dropDatabase,
  replaceDatabaseName,
  runMigrations,
} from '../scripts/seed/lib/database';
import {
  DEMO_ASSET_ROOT,
  removeDemoImages,
} from '../scripts/seed/lib/demo-images';
import { databaseHost } from '../scripts/seed/lib/guards';
import type { SeedExecutor } from '../scripts/seed/lib/seed-records';

const FIXED_NOW = new Date('2026-11-13T12:00:00.000Z');

function testBaseUrl(): string | null {
  const explicit = process.env.SEED_TEST_DATABASE_URL?.trim();
  if (explicit) return explicit;

  const fallback = process.env.DATABASE_URL?.trim();
  if (!fallback) return null;
  const host = databaseHost(fallback);
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    return null;
  }
  return fallback;
}

async function count(pool: Pool, sql: string): Promise<number> {
  const result = await pool.query<{ count: number }>(sql);
  return result.rows[0]?.count ?? -1;
}

describe('Seed bootstrap, demo and reset integration', () => {
  it('1. Bootstraps safely, seeds demo deterministically and resets demo only', async (t) => {
    const baseUrl = testBaseUrl();
    if (!baseUrl) {
      t.skip('Set SEED_TEST_DATABASE_URL or a local DATABASE_URL');
      return;
    }

    const scratchName = `quill_seed_test_${process.pid}_${Date.now()}`;
    const scratchUrl = replaceDatabaseName(baseUrl, scratchName);
    const adminUrl = adminUrlFrom(baseUrl);

    try {
      await createDatabase(adminUrl, scratchName);
    } catch (error) {
      t.skip(`Scratch database unavailable: ${(error as Error).message}`);
      return;
    }

    const savedEnv = {
      NOTIFICATION_RECIPIENT_EMAIL: process.env.NOTIFICATION_RECIPIENT_EMAIL,
      OWNER_EMAIL: process.env.OWNER_EMAIL,
      OWNER_PASSWORD: process.env.OWNER_PASSWORD,
      OWNER_FIRST_NAME: process.env.OWNER_FIRST_NAME,
      OWNER_LAST_NAME: process.env.OWNER_LAST_NAME,
      DEMO_OWNER_PASSWORD: process.env.DEMO_OWNER_PASSWORD,
      DEMO_MANAGER_PASSWORD: process.env.DEMO_MANAGER_PASSWORD,
      DEMO_RECEPTION_PASSWORD: process.env.DEMO_RECEPTION_PASSWORD,
    };

    process.env.NOTIFICATION_RECIPIENT_EMAIL = 'seed-test@example.test';
    process.env.OWNER_EMAIL = 'seed.test.owner@example.test';
    process.env.OWNER_PASSWORD = 'SeedTest!Owner1';
    process.env.OWNER_FIRST_NAME = 'Seed';
    process.env.OWNER_LAST_NAME = 'Owner';
    process.env.DEMO_OWNER_PASSWORD = 'DemoOwner!Pass1';
    process.env.DEMO_MANAGER_PASSWORD = 'DemoManager!Pass1';
    process.env.DEMO_RECEPTION_PASSWORD = 'DemoReception!Pass1';
    process.env.DATABASE_URL ??= baseUrl;

    const { runBootstrap } = await import('../scripts/seed/lib/bootstrap');
    const { runDemo } = await import('../scripts/seed/lib/demo');
    const { runResetDemo } = await import('../scripts/seed/lib/reset-demo');

    let pool: Pool | null = null;
    try {
      await runMigrations(scratchUrl);
      pool = new Pool({ connectionString: scratchUrl });
      const database = drizzle(pool);
      const executor = (tx: unknown) => tx as SeedExecutor;

      await database.transaction((tx) =>
        runBootstrap({ executor: executor(tx), now: FIXED_NOW }),
      );

      assert.equal(
        await count(pool, 'SELECT count(*)::int AS count FROM hotel_settings'),
        1,
      );
      assert.equal(
        await count(pool, 'SELECT count(*)::int AS count FROM site_pages'),
        9,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM site_pages WHERE status = 'draft'",
        ),
        9,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM staff_users WHERE role = 'owner'",
        ),
        1,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM seed_records WHERE seed_name = 'demo'",
        ),
        0,
      );

      await database.transaction((tx) =>
        runBootstrap({ executor: executor(tx), now: FIXED_NOW }),
      );
      assert.equal(
        await count(pool, 'SELECT count(*)::int AS count FROM site_pages'),
        9,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM staff_users WHERE role = 'owner'",
        ),
        1,
      );

      await database.transaction((tx) =>
        runDemo({
          executor: executor(tx),
          now: FIXED_NOW,
          randomSeed: 'seed-integration',
        }),
      );

      const demoReservations = await count(
        pool,
        "SELECT count(*)::int AS count FROM reservations WHERE reference LIKE 'DEMO-%'",
      );
      const demoRecords = await count(
        pool,
        "SELECT count(*)::int AS count FROM seed_records WHERE seed_name = 'demo'",
      );
      assert.ok(
        demoReservations >= 15,
        'demo should create a useful reservation mix',
      );
      assert.ok(
        demoRecords > demoReservations,
        'every demo row should be tracked',
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM reservations WHERE status = 'checked_in'",
        ),
        2,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM reservations WHERE status = 'pending'",
        ),
        5,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM reservations WHERE status = 'cancelled'",
        ),
        3,
      );
      assert.ok(fs.existsSync(`${DEMO_ASSET_ROOT}/gallery/demo-room.webp`));
      assert.ok(
        fs.existsSync(
          `${DEMO_ASSET_ROOT}/proofs/demo-bank-transfer-proof.webp`,
        ),
      );

      await database.transaction((tx) =>
        runDemo({
          executor: executor(tx),
          now: FIXED_NOW,
          randomSeed: 'seed-integration',
        }),
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM reservations WHERE reference LIKE 'DEMO-%'",
        ),
        demoReservations,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM seed_records WHERE seed_name = 'demo'",
        ),
        demoRecords,
      );

      await database.transaction((tx) => runResetDemo(executor(tx)));

      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM seed_records WHERE seed_name = 'demo'",
        ),
        0,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM reservations WHERE reference LIKE 'DEMO-%'",
        ),
        0,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM room_types WHERE slug LIKE 'demo-%'",
        ),
        0,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM staff_users WHERE email = 'demo.owner@example.test'",
        ),
        0,
      );
      assert.equal(
        await count(pool, 'SELECT count(*)::int AS count FROM hotel_settings'),
        1,
      );
      assert.equal(
        await count(pool, 'SELECT count(*)::int AS count FROM site_pages'),
        9,
      );
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM staff_users WHERE role = 'owner'",
        ),
        1,
      );
      assert.equal(fs.existsSync(DEMO_ASSET_ROOT), false);

      await database.transaction((tx) => runResetDemo(executor(tx)));
      assert.equal(
        await count(
          pool,
          "SELECT count(*)::int AS count FROM seed_records WHERE seed_name = 'demo'",
        ),
        0,
      );
    } finally {
      if (pool) await pool.end();
      await removeDemoImages().catch(() => undefined);
      await dropDatabase(adminUrl, scratchName).catch(() => undefined);
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
