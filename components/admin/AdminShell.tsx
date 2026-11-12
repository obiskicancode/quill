'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  BedDouble,
  CalendarDays,
  ClipboardList,
  ConciergeBell,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, type CSSProperties, type ReactNode } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmProvider } from '@/components/ui/confirm';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAdminLogout } from '@/hooks/services/admin/use-auth';
import { ADMIN_NAV, ROLE_LABELS } from '@/lib/auth/permissions';
import type { AdminIdentity, AdminRole, Permission } from '@/types/auth.types';

const icons = {
  '/admin': LayoutDashboard,
  '/admin/reservations': ClipboardList,
  '/admin/calendar': CalendarDays,
  '/admin/enquiries': MessageSquare,
  '/admin/rooms': BedDouble,
  '/admin/rates': BadgeDollarSign,
  '/admin/extras': Sparkles,
  '/admin/amenities': ConciergeBell,
  '/admin/content': FileText,
  '/admin/payments': CreditCard,
  '/admin/settings': Settings,
  '/admin/staff': Users,
  '/admin/audit': History,
};

// Sections wired to the "next build phase" stub in app/admin/(shell)/[section].
// Hidden from the sidebar so staff are not sent to a page with no live records.
const UNBUILT_ADMIN_SECTIONS = new Set([
  '/admin/enquiries',
  '/admin/content',
  '/admin/settings',
]);

interface AdminSidebarProps {
  user: AdminIdentity;
  role: AdminRole;
  permissions: readonly Permission[];
  mfaPending: boolean;
  signingOut: boolean;
  onSignOut: () => void;
}

function AdminSidebar({
  user,
  role,
  permissions,
  mfaPending,
  signingOut,
  onSignOut,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const groups = mfaPending
    ? []
    : ADMIN_NAV.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            permissions.includes(item.permission) &&
            !UNBUILT_ADMIN_SECTIONS.has(item.href),
        ),
      })).filter((group) => group.items.length > 0);

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="offcanvas"
      className="z-(--z-panel) border-r border-sidebar-border"
    >
      <div className="on-dark flex h-full min-h-0 flex-col bg-ink text-paper">
        <SidebarHeader className="h-(--header-h) flex-row items-center justify-between border-b border-sidebar-border px-3 py-0 md:max-lg:justify-center md:max-lg:px-1">
          <Link
            href="/admin"
            onClick={closeMobile}
            aria-label="Divine admin"
            className="font-display text-h3"
          >
            <span className="md:max-lg:sr-only">
              Divine <span className="text-brand">admin</span>
            </span>
            <span
              aria-hidden
              className="hidden size-8 items-center justify-center rounded-control bg-primary text-small font-semibold text-primary-foreground md:max-lg:inline-flex"
            >
              D
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            aria-label="Close navigation"
            className="hover:bg-sidebar-accent md:hidden"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          {mfaPending && (
            <div className="p-3 pb-0 md:max-lg:p-1 md:max-lg:pb-0">
              <Link
                href="/admin/account?setup=required"
                onClick={closeMobile}
                aria-label="Finish two-factor setup"
                title="Finish two-factor setup"
                className="block rounded-control border border-primary/40 bg-primary/10 p-3 text-small text-paper hover:bg-primary/20 md:max-lg:flex md:max-lg:size-10 md:max-lg:items-center md:max-lg:justify-center md:max-lg:p-0"
              >
                <ShieldAlert
                  className="hidden size-5 shrink-0 text-primary md:max-lg:block"
                  aria-hidden
                />
                <span className="md:max-lg:sr-only">
                  <span className="font-semibold">Finish two-factor setup</span>
                  <span className="mt-1 block text-caption text-sidebar-foreground/70">
                    Required before the admin opens.
                  </span>
                </span>
              </Link>
            </div>
          )}
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="pb-1 md:max-lg:px-1">
              <SidebarGroupLabel className="text-caption tracking-wide text-sidebar-foreground/50 uppercase md:max-lg:hidden">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon =
                      icons[item.href as keyof typeof icons] ?? LayoutDashboard;
                    const active =
                      item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={
                            <Link
                              href={item.href}
                              onClick={closeMobile}
                              aria-current={active ? 'page' : undefined}
                            />
                          }
                          isActive={active}
                          tooltip={item.label}
                          className="min-h-10 gap-2.5 px-2.5 text-small text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-brand-hover md:max-lg:size-10 md:max-lg:justify-center md:max-lg:gap-0 md:max-lg:p-0"
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="md:max-lg:sr-only">
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 md:max-lg:p-1">
          <Link
            href="/admin/account"
            onClick={closeMobile}
            className="flex items-center gap-2.5 rounded-control px-1 py-1 hover:bg-sidebar-accent md:max-lg:justify-center md:max-lg:gap-0 md:max-lg:px-0"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-small font-bold text-primary-foreground">
                {initials || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 md:max-lg:sr-only">
              <span className="block truncate text-small font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="block truncate text-caption text-sidebar-foreground/60">
                {ROLE_LABELS[role]}
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={onSignOut}
            icon={<LogOut className="size-4" aria-hidden />}
            className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground md:max-lg:mx-auto md:max-lg:size-9 md:max-lg:justify-center md:max-lg:px-0"
          >
            <span className="md:max-lg:sr-only">Sign out</span>
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

export function AdminShell({
  user,
  role,
  permissions,
  mfaPending = false,
  children,
}: {
  user: AdminIdentity;
  role: AdminRole;
  permissions: readonly Permission[];
  mfaPending?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const logout = useAdminLogout();
  const signingOut = logout.isPending;

  useEffect(() => {
    const handler = () => router.replace('/admin/login?expired=1');
    window.addEventListener('admin:session-expired', handler);
    return () => window.removeEventListener('admin:session-expired', handler);
  }, [router]);

  async function signOut() {
    try {
      await logout.mutateAsync();
    } catch {
      // The cookies are cleared server-side whenever possible; continue to login.
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  return (
    <SidebarProvider
      className="min-h-dvh bg-paper md:max-lg:[--admin-sidebar-width:var(--sidebar-width-icon)]"
      style={
        {
          '--sidebar-width': 'var(--admin-sidebar-width, 16rem)',
        } as CSSProperties
      }
    >
      <AdminSidebar
        user={user}
        role={role}
        permissions={permissions}
        mfaPending={mfaPending}
        signingOut={signingOut}
        onSignOut={signOut}
      />
      <SidebarInset className="min-w-0 bg-paper">
        <header className="sticky top-0 z-(--z-sticky) flex h-(--header-h) items-center gap-3 border-b border-line bg-card/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/admin/account" />}
            className="hidden font-semibold sm:inline-flex"
          >
            Account
          </Button>
        </header>

        <main id="main" className="flex-1 px-4 py-5 md:px-6 md:py-7 xl:px-8">
          <ConfirmProvider>
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </ConfirmProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
