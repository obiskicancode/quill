import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

import {
  AccountView,
  type AccountTab,
} from '@/components/admin/account/AccountView';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { isMfaPending } from '@/lib/auth/session';
import { toAdminStaff } from '@/lib/db/mappers/staff.mapper';

export const metadata: Metadata = { title: 'Account' };

const validTabs: AccountTab[] = [
  'profile',
  'password',
  'two-factor',
  'sessions',
];

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAdminPage(undefined, { allowPending: true });
  const params = await searchParams;
  const pending = isMfaPending(context);
  const requested = typeof params.tab === 'string' ? params.tab : '';
  const setupRequired = params.setup === 'required';
  const initialTab: AccountTab =
    pending || setupRequired
      ? 'two-factor'
      : validTabs.includes(requested as AccountTab)
        ? (requested as AccountTab)
        : 'profile';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        description="Manage your profile, password, two-factor authentication and signed-in devices."
        actions={
          !pending ? (
            <Link
              href="/admin"
              className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-3 text-small font-semibold hover:bg-ink/5"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Dashboard
            </Link>
          ) : undefined
        }
      />
      <AccountView
        staff={toAdminStaff(context.user)}
        role={context.role}
        mfaPending={pending}
        initialTab={initialTab}
      />
    </div>
  );
}
