import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { hashPassword, validatePassword } from '@/lib/auth/password';

type OwnerExecutor = Pick<typeof db, 'select' | 'insert'>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export interface OwnerSeedResult {
  created: boolean;
  email: string;
}

/**
 * Creates the first owner account. It refuses when any owner already exists so
 * bootstrap can be re-run safely without changing production credentials.
 */
export async function runOwnerSeed(
  executor: OwnerExecutor = db,
): Promise<OwnerSeedResult> {
  const [existing] = await executor
    .select({ id: staffUsers.id, email: staffUsers.email })
    .from(staffUsers)
    .where(eq(staffUsers.role, 'owner'))
    .limit(1);

  if (existing) {
    console.log(
      `Owner already exists (${existing.email}); leaving it unchanged.`,
    );
    return { created: false, email: existing.email };
  }

  const email = required('OWNER_EMAIL').toLowerCase();
  const password = required('OWNER_PASSWORD');
  const firstName = process.env.OWNER_FIRST_NAME?.trim() || 'Owner';
  const lastName = process.env.OWNER_LAST_NAME?.trim() || 'Account';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('OWNER_EMAIL is not a valid email address');
  }
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(password);
  const [row] = await executor
    .insert(staffUsers)
    .values({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'owner',
      isActive: true,
    })
    .returning({ id: staffUsers.id, email: staffUsers.email });

  console.log(`Owner created: ${row!.email}`);
  console.log('Two-factor remains unchanged. Set it up after signing in.');
  return { created: true, email: row!.email };
}

async function main(): Promise<void> {
  await runOwnerSeed();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
