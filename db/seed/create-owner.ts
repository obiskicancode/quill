import { hashPassword, validatePassword } from '@/lib/auth/password';
import {
  createStaff,
  findStaffByEmail,
  update as updateStaff,
} from '@/lib/db/repositories/staff.repo';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

async function main(): Promise<void> {
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
  const existing = await findStaffByEmail(email);

  if (existing) {
    await updateStaff(existing.id, {
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'owner',
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
      deactivatedAt: null,
      deactivatedBy: null,
    });
    console.log(`Owner updated: ${email}`);
  } else {
    await createStaff({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'owner',
      isActive: true,
    });
    console.log(`Owner created: ${email}`);
  }

  console.log('Two-factor remains unchanged. Set it up after signing in.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
