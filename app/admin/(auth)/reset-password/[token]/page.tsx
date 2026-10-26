import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/components/admin/ResetPasswordForm';
import { readAdminContext } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Reset password' };

export default async function AdminResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const context = await readAdminContext();
  if (context) redirect('/admin');

  const { token } = await params;
  if (!token || token.length < 20) redirect('/admin/forgot-password');
  return <ResetPasswordForm token={token} />;
}
