import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { assertDbUrl } from '../config';
import * as schema from './schema';

const globalForDb = globalThis as typeof globalThis & {
  conn?: Pool;
  client?: NodePgDatabase<typeof schema>;
};

function connect(): NodePgDatabase<typeof schema> {
  const pool =
    globalForDb.conn ??
    new Pool({
      connectionString: assertDbUrl(),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

  globalForDb.conn = pool;

  return drizzle(pool, { schema });
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property) {
    const client = (globalForDb.client ??= connect());
    const value = Reflect.get(client, property);

    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export { schema };
