import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEMO_OVERRIDE_FLAG } from '../scripts/seed/lib/args';
import { databaseNameFromUrl } from '../scripts/seed/lib/database';
import {
  createSeededRandom,
  deterministicUuid,
} from '../scripts/seed/lib/deterministic';
import {
  assertDemoAllowed,
  assertNotProduction,
  databaseHost,
  parseHostAllowlist,
} from '../scripts/seed/lib/guards';

describe('Seed safety guards', () => {
  it('1. Always refuses demo data when NODE_ENV=production', () => {
    assert.throws(
      () =>
        assertDemoAllowed({
          nodeEnv: 'production',
          databaseUrl: 'postgres://user:pass@localhost:5432/quill',
          allowlist: 'localhost',
        }),
      /never allowed when NODE_ENV=production/,
    );
    assert.throws(() => assertNotProduction('production'), /Refusing to run/);
  });

  it('2. Allows a host on the allowlist, including a port entry', () => {
    const result = assertDemoAllowed({
      nodeEnv: 'development',
      databaseUrl: 'postgres://user:pass@DB.example.test:5432/quill',
      allowlist: 'api.example.test, db.example.test:5432',
    });
    assert.deepEqual(result, {
      host: 'db.example.test',
      viaOverrideFlag: false,
    });
  });

  it('3. Refuses an unlisted host without the explicit override flag', () => {
    assert.throws(
      () =>
        assertDemoAllowed({
          nodeEnv: 'development',
          databaseUrl: 'postgres://user:pass@db.example.test:5432/quill',
          allowlist: 'localhost',
          argv: [],
        }),
      /Refusing to seed demo data/,
    );
  });

  it('4. Allows an unlisted host only with the explicit override flag', () => {
    const result = assertDemoAllowed({
      nodeEnv: 'development',
      databaseUrl: 'postgres://user:pass@db.example.test:5432/quill',
      allowlist: 'localhost',
      argv: [DEMO_OVERRIDE_FLAG],
    });
    assert.equal(result.viaOverrideFlag, true);
  });

  it('5. Parses empty, spaced and duplicate allowlist entries', () => {
    assert.deepEqual(parseHostAllowlist(undefined), []);
    assert.deepEqual(parseHostAllowlist(' LocalHost , ,127.0.0.1,localhost '), [
      'localhost',
      '127.0.0.1',
      'localhost',
    ]);
  });

  it('6. Reads hosts and database names from connection URLs', () => {
    assert.equal(
      databaseHost('postgres://user:pass@LOCALHOST:5432/quill'),
      'localhost',
    );
    assert.equal(
      databaseNameFromUrl('postgres://user:pass@localhost:5432/quill_test'),
      'quill_test',
    );
  });
});

describe('Deterministic seed values', () => {
  it('1. Produces stable UUIDs for the same seed and key', () => {
    const first = deterministicUuid('demo', 'reservation:one');
    const second = deterministicUuid('demo', 'reservation:one');
    const other = deterministicUuid('demo', 'reservation:two');

    assert.equal(first, second);
    assert.notEqual(first, other);
    assert.match(
      first,
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('2. Replays the same random sequence for the same seed', () => {
    const first = createSeededRandom('quill-demo-2026');
    const second = createSeededRandom('quill-demo-2026');

    assert.deepEqual(
      [first.next(), first.next(), first.next()],
      [second.next(), second.next(), second.next()],
    );
  });

  it('3. Changes the sequence when the seed changes', () => {
    const first = createSeededRandom('seed-a');
    const second = createSeededRandom('seed-b');
    assert.notEqual(first.next(), second.next());
  });
});
