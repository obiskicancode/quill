import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/admin/ForgotPasswordForm';
import { config } from '@/config';
import { readAdminContext } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function AdminForgotPasswordPage() {
  const context = await readAdminContext();
  if (context) redirect('/admin');
  return <ForgotPasswordForm resetLinkInServerLog={config.isDev} />;
}
