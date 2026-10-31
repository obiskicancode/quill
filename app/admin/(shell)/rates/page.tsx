import { RateRulesClient } from '@/components/admin/inventory/RateRulesClient';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import {
  listAdminRateRules,
  listAdminRoomTypes,
} from '@/lib/db/repositories/inventory.repo';

export const metadata = {
  title: 'Rate Rules | Admin',
};

export default async function AdminRatesPage() {
  await requireAdminPage('rates.manage');

  const [initialRules, roomTypes] = await Promise.all([
    listAdminRateRules(),
    listAdminRoomTypes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate rules"
        description="Set up seasonal uplifts, weekend rules, and extended stay discounts. Existing reservations keep their locked snapshot."
      />
      <RateRulesClient initialRules={initialRules} roomTypes={roomTypes} />
    </div>
  );
}
