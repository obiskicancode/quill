import { PageHeader } from '@/components/admin/PageHeader';
import { StaffClient } from '@/components/admin/staff/StaffClient';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata = {
  title: 'Staff Accounts | Admin',
};

export default async function AdminStaffPage() {
  // Owner only guard
  await requireAdminPage('staff.manage');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Accounts"
        description="Manage staff members, roles, permissions, invitations, and active sessions."
      />
      <StaffClient />
    </div>
  );
}
