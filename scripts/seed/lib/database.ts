import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';

export function databaseNameFromUrl(databaseUrl: string): string {
  const name = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!name) throw new Error('DATABASE_URL does not include a database name');
  return decodeURIComponent(name);
}

export function replaceDatabaseName(databaseUrl: string, name: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export function adminUrlFrom(databaseUrl: string): string {
  return replaceDatabaseName(databaseUrl, 'postgres');
}

export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function withAdminClient<T>(
  adminUrl: string,
  work: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function terminateConnections(
  client: Client,
  databaseName: string,
): Promise<void> {
  await client.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()`,
    [databaseName],
  );
}

export async function dropDatabase(
  adminUrl: string,
  databaseName: string,
): Promise<void> {
  await withAdminClient(adminUrl, async (client) => {
    await terminateConnections(client, databaseName);
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
    );
  });
}

export async function createDatabase(
  adminUrl: string,
  databaseName: string,
  options: { template?: string } = {},
): Promise<void> {
  await withAdminClient(adminUrl, async (client) => {
    await terminateConnections(client, databaseName);
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
    );
    const template = options.template
      ? ` TEMPLATE ${quoteIdentifier(options.template)}`
      : '';
    await client.query(
      `CREATE DATABASE ${quoteIdentifier(databaseName)}${template}`,
    );
  });
}

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'db', 'migrations'),
    });
  } finally {
    await pool.end();
  }
}
