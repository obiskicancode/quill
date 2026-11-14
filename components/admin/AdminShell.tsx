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
  PanelLeftIcon,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

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
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const collapsed = !isMobile && state === 'collapsed';

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
      collapsible="icon"
      className="z-(--z-panel) border-r border-sidebar-border"
    >
      <div className="on-dark flex h-full min-h-0 flex-col bg-ink text-paper">
        <SidebarHeader className="h-(--header-h) flex-row items-center justify-between border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1">
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="group/brand-toggle flex size-9 cursor-col-resize items-center justify-center rounded-control bg-primary text-small font-semibold text-primary-foreground ring-sidebar-ring outline-hidden focus-visible:ring-2"
            >
              <span aria-hidden className="group-hover/brand-toggle:hidden">
                Q
              </span>
              <PanelLeftIcon
                aria-hidden
                className="hidden size-4 group-hover/brand-toggle:block"
              />
              <span className="sr-only">Expand sidebar</span>
            </button>
          ) : (
            <>
              <Link
                href="/admin"
                onClick={closeMobile}
                aria-label="Quill admin"
                className="font-display text-h3"
              >
                Quill <span className="text-brand">admin</span>
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
              <SidebarTrigger className="hidden shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex" />
            </>
          )}
        </SidebarHeader>

        <SidebarContent>
          {mfaPending && (
            <div className="p-3 pb-0 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:pb-0">
              <Link
                href="/admin/account?setup=required"
                onClick={closeMobile}
                aria-label="Finish two-factor setup"
                title="Finish two-factor setup"
                className="block rounded-control border border-primary/40 bg-primary/10 p-3 text-small text-paper group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-primary/20"
              >
                <ShieldAlert
                  className="hidden size-5 shrink-0 text-primary group-data-[collapsible=icon]:block"
                  aria-hidden
                />
                <span className="group-data-[collapsible=icon]:sr-only">
                  <span className="font-semibold">Finish two-factor setup</span>
                  <span className="mt-1 block text-caption text-sidebar-foreground/70">
                    Required before the admin opens.
                  </span>
                </span>
              </Link>
            </div>
          )}
          {groups.map((group) => (
            <SidebarGroup
              key={group.label}
              className="pb-1 group-data-[collapsible=icon]:px-1"
            >
              <SidebarGroupLabel className="text-caption tracking-wide text-sidebar-foreground/50 uppercase">
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
                          className="min-h-10 gap-2.5 px-2.5 text-small text-sidebar-foreground/80 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-brand-hover"
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="group-data-[collapsible=icon]:sr-only">
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

        <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-1">
          <Link
            href="/admin/account"
            onClick={closeMobile}
            className="flex items-center gap-2.5 rounded-control px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-small font-bold text-primary-foreground">
                {initials || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 group-data-[collapsible=icon]:sr-only">
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
            className="justify-start text-sidebar-foreground/80 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <span className="group-data-[collapsible=icon]:sr-only">
              Sign out
            </span>
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

/**
 * Admin chrome and navigation. It filters nav entries by the signed-in role's
 * permissions, keeps the mobile sidebar state, and exposes the logout action.
 */
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
    <SidebarProvider className="min-h-dvh bg-paper">
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
          <SidebarTrigger className="md:hidden" />
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
