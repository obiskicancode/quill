import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { assertDbUrl, config } from '../config';
import * as schema from './schema';

assertDbUrl();

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const pool =
  globalForDb.conn ??
  new Pool({
    connectionString: config.DB.URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (config.isDev) globalForDb.conn = pool;

export const db = drizzle(pool, { schema });
export { schema };
