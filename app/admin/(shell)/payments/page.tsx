import { PageHeader } from '@/components/admin/PageHeader';
import { PaymentsClient } from '@/components/admin/payments/PaymentsClient';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata = {
  title: 'Payments & Reconciliation | Admin',
};

export default async function AdminPaymentsPage() {
  const context = await requireAdminPage('payments.view');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Review transactions, verify bank transfers, manage manual refund payouts, and reconcile accounts."
      />
      <PaymentsClient isOwner={context.role === 'owner'} />
    </div>
  );
}
