import { AuditClient } from '@/components/admin/audit/AuditClient';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata = {
  title: 'Audit Log | Admin',
};

export default async function AdminAuditPage() {
  // Manager and Owner access (reception redirected to /admin/forbidden)
  const context = await requireAdminPage('audit.view');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Review operational events, price adjustments, staff modifications, and security actions."
      />
      <AuditClient isOwner={context.role === 'owner'} />
    </div>
  );
}
