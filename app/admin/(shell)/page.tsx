import Link from 'next/link';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CreditCard,
  FileText,
  KeyRound,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';

import { AdminCard } from '@/components/admin/AdminCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { requireAdminPage } from '@/lib/auth/guards';
import {
  ADMIN_NAV,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from '@/lib/auth/permissions';

export const metadata: Metadata = { title: 'Dashboard' };

const icons = {
  '/admin/reservations': CalendarDays,
  '/admin/calendar': CalendarDays,
  '/admin/enquiries': MessageSquare,
  '/admin/rooms': BedDouble,
  '/admin/content': FileText,
  '/admin/payments': CreditCard,
  '/admin/settings': Settings,
  '/admin/staff': Users,
};

export default async function AdminDashboardPage() {
  const context = await requireAdminPage('dashboard.view');
  const permissions = ROLE_PERMISSIONS[context.role];
  const links = ADMIN_NAV.flatMap((group) => group.items).filter(
    (item) => item.href !== '/admin' && permissions.includes(item.permission),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome, ${context.user.firstName}`}
        description={`You are signed in as ${ROLE_LABELS[context.role]}. Management screens are being added next; use the shortcuts below to preview your access.`}
      />

      {!context.user.mfaEnabled && (
        <StatusBanner tone="info">
          <span className="font-semibold">Protect your account.</span>{' '}
          <Link
            href="/admin/account?tab=two-factor"
            className="underline decoration-current underline-offset-4"
          >
            Set up two-factor authentication
          </Link>{' '}
          before managing live bookings.
        </StatusBanner>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AdminCard
          title="Your workspace"
          description="These links match the permissions on your role."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map((item) => {
              const Icon =
                icons[item.href as keyof typeof icons] ?? CalendarDays;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-14 items-center gap-3 rounded-control border border-line px-3 py-2.5 text-small font-semibold hover:border-ink/40 hover:bg-paper"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-paper">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <AdminCard
          title="Account security"
          description="Keep the front desk secure."
        >
          <dl className="space-y-3 text-small">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Role</dt>
              <dd className="font-semibold">{ROLE_LABELS[context.role]}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Two-factor</dt>
              <dd className="font-semibold">
                {context.user.mfaEnabled ? 'Enabled' : 'Not enabled'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Last sign in</dt>
              <dd className="font-semibold">
                {context.user.lastLoginAt
                  ? new Intl.DateTimeFormat('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(context.user.lastLoginAt)
                  : 'First sign in'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2">
            <Link
              href="/admin/account?tab=two-factor"
              className="flex min-h-11 items-center gap-2 rounded-control border border-line px-3 text-small font-semibold hover:border-ink/40"
            >
              <ShieldCheck className="size-4" aria-hidden />
              Two-factor settings
            </Link>
            <Link
              href="/admin/account?tab=sessions"
              className="flex min-h-11 items-center gap-2 rounded-control border border-line px-3 text-small font-semibold hover:border-ink/40"
            >
              <KeyRound className="size-4" aria-hidden />
              Signed-in devices
            </Link>
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="Next modules"
        description="The foundation is in place. These screens will be wired to live data in the next phase."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Reservations', 'Arrivals, departures and changes'],
            ['Availability', 'Blocks and nightly inventory'],
            ['Enquiries', 'Guest messages and follow-up'],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-control border border-dashed border-line bg-paper p-3"
            >
              <p className="text-small font-semibold">{title}</p>
              <p className="mt-1 text-caption text-muted">{description}</p>
              <span className="mt-3 inline-block rounded-full bg-ink/5 px-2 py-1 text-caption font-semibold text-muted">
                Coming next
              </span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
