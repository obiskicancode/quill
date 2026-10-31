import { ExtrasClient } from '@/components/admin/inventory/ExtrasClient';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { listAdminExtras } from '@/lib/db/repositories/inventory.repo';

export const metadata = {
  title: 'Extras & Add-ons | Admin',
};

export default async function AdminExtrasPage() {
  await requireAdminPage('extras.manage');
  const initialExtras = await listAdminExtras();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extras & add-ons"
        description="Configure guest services, airport transfers, dining packages, and pricing units."
      />
      <ExtrasClient initialExtras={initialExtras} />
    </div>
  );
}
