'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BedDouble,
  CalendarDays,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  ADMIN_NAV,
  ROLE_LABELS,
  type AdminRole,
  type Permission,
} from '@/lib/auth/permissions';

const icons = {
  '/admin': LayoutDashboard,
  '/admin/reservations': CalendarDays,
  '/admin/calendar': CalendarDays,
  '/admin/enquiries': MessageSquare,
  '/admin/rooms': BedDouble,
  '/admin/content': FileText,
  '/admin/payments': CreditCard,
  '/admin/settings': Settings,
  '/admin/staff': Users,
  '/admin/audit': History,
};

interface ShellUser {
  firstName: string;
  lastName: string;
  email: string;
}

export function AdminShell({
  user,
  role,
  permissions,
  mfaPending = false,
  children,
}: {
  user: ShellUser;
  role: AdminRole;
  permissions: readonly Permission[];
  mfaPending?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handler = () => router.replace('/admin/login?expired=1');
    window.addEventListener('admin:session-expired', handler);
    return () => window.removeEventListener('admin:session-expired', handler);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const groups = mfaPending
    ? []
    : ADMIN_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          permissions.includes(item.permission),
        ),
      })).filter((group) => group.items.length > 0);

  async function signOut() {
    setSigningOut(true);
    try {
      await adminService.logout();
    } catch {
      // The cookies are cleared server-side whenever possible; continue to login.
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="bg-paper min-h-dvh md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="bg-ink/50 fixed inset-0 z-40 md:hidden"
        />
      )}

      <aside
        className={`on-dark bg-ink text-paper fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col transition-transform duration-200 motion-reduce:transition-none md:static md:w-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="font-display text-h3"
          >
            Divine <span className="text-accent">admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-control grid size-11 place-items-center hover:bg-white/10 md:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
          {mfaPending && (
            <Link
              href="/admin/account?setup=required"
              onClick={() => setOpen(false)}
              className="rounded-control border-accent/40 bg-accent/10 text-small text-paper hover:bg-accent/20 mb-3 block border p-3"
            >
              <span className="font-semibold">Finish two-factor setup</span>
              <span className="text-caption mt-1 block text-white/70">
                Required before the admin opens.
              </span>
            </Link>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-caption mb-1.5 px-2 font-semibold tracking-wide text-white/50 uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon =
                    icons[item.href as keyof typeof icons] ?? LayoutDashboard;
                  const active =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`rounded-control text-small flex min-h-10 items-center gap-2.5 px-2.5 font-medium ${
                          active
                            ? 'bg-accent text-ink'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className="rounded-control flex items-center gap-2.5 px-2 py-2 hover:bg-white/10"
          >
            <span className="bg-accent text-small text-ink grid size-9 shrink-0 place-items-center rounded-full font-bold">
              {initials || 'A'}
            </span>
            <span className="min-w-0">
              <span className="text-small block truncate font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-caption block truncate text-white/60">
                {ROLE_LABELS[role]}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-line bg-surface/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="rounded-control border-line grid size-11 place-items-center border md:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-small truncate font-semibold">{user.email}</p>
            <p className="text-caption text-muted">{ROLE_LABELS[role]}</p>
          </div>

          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className="rounded-control text-small hover:bg-ink/5 hidden px-3 py-2 font-semibold sm:block"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="rounded-control text-small hover:bg-ink/5 flex min-h-10 items-center gap-2 px-3 font-semibold disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </header>

        <main id="main" className="flex-1 px-4 py-5 md:px-6 md:py-7 xl:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
