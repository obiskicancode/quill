import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Construction } from 'lucide-react';
import type { Metadata } from 'next';

import { AdminCard } from '@/components/admin/AdminCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { ADMIN_SECTIONS } from '@/lib/auth/permissions';

const sectionDetails: Record<string, readonly string[]> = {
  reservations: [
    'Arrivals and departures for today',
    'Search, view and update bookings',
    'Cancellation and date-change review',
  ],
  calendar: [
    'Monthly availability by room',
    'Room blocks with a reason',
    'Rate and minimum-stay overlays',
  ],
  enquiries: [
    'New website enquiries',
    'Reply history and internal notes',
    'Convert an enquiry into a booking',
  ],
  rooms: [
    'Room types, amenities and photos',
    'Physical room inventory',
    'Seasonal rates and extra beds',
  ],
  content: [
    'Homepage, facilities and gallery copy',
    'FAQs and nearby attractions',
    'Preview before publishing',
  ],
  payments: [
    'Successful and pending payments',
    'Transfer proof review',
    'Refund records',
  ],
  settings: [
    'Hotel contact and policy details',
    'Check-in and booking rules',
    'Notification recipients',
  ],
  staff: [
    'Invite staff members',
    'Assign owner, manager or reception roles',
    'Deactivate access immediately',
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: ADMIN_SECTIONS[section]?.title ?? 'Admin' };
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = ADMIN_SECTIONS[section];
  if (!meta) notFound();
  await requireAdminPage(meta.permission);

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <Link
            href="/admin"
            className="rounded-control border-line text-small hover:bg-ink/5 inline-flex min-h-10 items-center gap-2 border px-3 font-semibold"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dashboard
          </Link>
        }
      />

      <AdminCard>
        <div className="mx-auto max-w-xl py-6 text-center">
          <span className="bg-paper mx-auto grid size-14 place-items-center rounded-full">
            <Construction className="size-7" aria-hidden />
          </span>
          <h2 className="font-display text-h3 mt-4">Access confirmed</h2>
          <p className="text-small text-muted mt-2">
            Your role can open this section. The working screens are part of the
            next build phase, so no live records are shown yet.
          </p>
          <ul className="mt-5 space-y-2 text-left">
            {(sectionDetails[section] ?? []).map((item) => (
              <li
                key={item}
                className="rounded-control border-line text-small flex items-start gap-2 border px-3 py-2"
              >
                <span className="bg-accent mt-2 size-1.5 shrink-0 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </AdminCard>
    </div>
  );
}
