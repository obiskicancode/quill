import { defineConfig } from 'drizzle-kit';

import { config } from './config';

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DB.URL,
  },
  verbose: true,
  strict: true,
});
