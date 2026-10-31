import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { VerifyForm } from '@/components/admin/VerifyForm';
import { readAdminContext } from '@/lib/auth/guards';
import { ADMIN_CHALLENGE_COOKIE_NAME } from '@/lib/cookies/constants';

export const metadata: Metadata = { title: 'Verify sign in' };

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await readAdminContext();
  if (context) redirect('/admin');

  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_CHALLENGE_COOKIE_NAME)?.value) {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  return <VerifyForm next={next} />;
}
