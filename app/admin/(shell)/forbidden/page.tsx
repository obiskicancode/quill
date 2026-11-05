import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

import { AdminCard } from '@/components/admin/AdminCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Access denied' };

export default async function AdminForbiddenPage() {
  await requireAdminPage();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Access denied"
        description="Your role does not include this permission."
      />
      <AdminCard>
        <div className="mx-auto max-w-lg py-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-paper text-destructive">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <p className="mt-4 text-small text-muted-foreground">
            Ask the owner or manager if you need access. Role changes take
            effect on your next request.
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-ink px-4 text-small font-semibold text-paper hover:bg-ink-soft"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to dashboard
          </Link>
        </div>
      </AdminCard>
    </div>
  );
}
