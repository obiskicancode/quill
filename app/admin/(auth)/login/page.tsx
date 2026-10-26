import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { LoginForm } from '@/components/admin/LoginForm';
import { readAdminContext } from '@/lib/auth/guards';
import { isMfaPending } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await readAdminContext();
  if (context) {
    redirect(
      isMfaPending(context) ? '/admin/account?setup=required' : '/admin',
    );
  }

  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  return (
    <LoginForm
      next={next}
      expired={params.expired === '1'}
      reset={params.reset === '1'}
    />
  );
}
