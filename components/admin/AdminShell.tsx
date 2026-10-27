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
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { ADMIN_NAV, ROLE_LABELS } from '@/lib/auth/permissions';
import type { AdminIdentity } from '@/types/admin.types';
import type { AdminRole, Permission } from '@/types/auth.types';

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
        items: group.items.filter((item) =>
          permissions.includes(item.permission),
        ),
      })).filter((group) => group.items.length > 0);

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-white/10">
      <div className="on-dark bg-ink text-paper flex h-full min-h-0 flex-col">
        <SidebarHeader className="h-16 flex-row items-center justify-between border-b border-white/10 px-3 py-0 md:max-lg:justify-center md:max-lg:px-1">
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
              className="bg-primary text-small text-primary-foreground rounded-control hidden size-8 items-center justify-center font-semibold md:max-lg:inline-flex"
            >
              D
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            aria-label="Close navigation"
            className="hover:bg-white/10 md:hidden"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          {mfaPending && (
            <div className="p-3 pb-0">
              <Link
                href="/admin/account?setup=required"
                onClick={closeMobile}
                aria-label="Finish two-factor setup"
                className="rounded-control border-primary/40 bg-primary/10 text-small text-paper hover:bg-primary/20 block border p-3 md:max-lg:flex md:max-lg:size-10 md:max-lg:items-center md:max-lg:justify-center md:max-lg:p-0"
              >
                <ShieldAlert
                  className="text-primary hidden size-5 shrink-0 md:max-lg:block"
                  aria-hidden
                />
                <span className="md:max-lg:sr-only">
                  <span className="font-semibold">Finish two-factor setup</span>
                  <span className="text-caption mt-1 block text-white/70">
                    Required before the admin opens.
                  </span>
                </span>
              </Link>
            </div>
          )}
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="pb-1 md:max-lg:px-1">
              <SidebarGroupLabel className="text-caption tracking-wide text-white/50 uppercase md:max-lg:hidden">
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
                          className="text-small data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-brand-hover min-h-10 gap-2.5 px-2.5 text-white/80 hover:bg-white/10 hover:text-white md:max-lg:size-10 md:max-lg:justify-center md:max-lg:gap-0 md:max-lg:p-0"
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

        <SidebarFooter className="gap-2 border-t border-white/10 p-3 md:max-lg:p-1">
          <Link
            href="/admin/account"
            onClick={closeMobile}
            className="rounded-control flex items-center gap-2.5 px-1 py-1 hover:bg-white/10 md:max-lg:justify-center md:max-lg:gap-0 md:max-lg:px-0"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-small text-primary-foreground font-bold">
                {initials || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 md:max-lg:sr-only">
              <span className="text-small block truncate font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-caption block truncate text-white/60">
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
            className="justify-start text-white/80 hover:bg-white/10 hover:text-white md:max-lg:mx-auto md:max-lg:size-9 md:max-lg:justify-center md:max-lg:px-0"
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
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handler = () => router.replace('/admin/login?expired=1');
    window.addEventListener('admin:session-expired', handler);
    return () => window.removeEventListener('admin:session-expired', handler);
  }, [router]);

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

  return (
    <SidebarProvider
      className="bg-paper min-h-dvh md:max-lg:[--admin-sidebar-width:var(--sidebar-width-icon)]"
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
      <SidebarInset className="bg-paper min-w-0">
        <header className="border-line bg-card/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="text-small truncate font-semibold">{user.email}</p>
            <p className="text-caption text-muted-foreground">
              {ROLE_LABELS[role]}
            </p>
          </div>
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
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
