import type { ReactNode } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/auth/guards';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { isMfaPending } from '@/lib/auth/session';

export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireAdminPage(undefined, { allowPending: true });
  const mfaPending = isMfaPending(context);
  return (
    <AdminShell
      user={{
        firstName: context.user.firstName,
        lastName: context.user.lastName,
        email: context.user.email,
      }}
      role={context.role}
      permissions={ROLE_PERMISSIONS[context.role]}
      mfaPending={mfaPending}
    >
      {children}
    </AdminShell>
  );
}
