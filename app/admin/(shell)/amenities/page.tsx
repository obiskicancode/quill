import { AmenitiesClient } from '@/components/admin/inventory/AmenitiesClient';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { listAdminAmenitiesWithUsage } from '@/lib/db/repositories/inventory.repo';

export const metadata = {
  title: 'Amenities Catalogue | Admin',
};

export default async function AdminAmenitiesPage() {
  await requireAdminPage('amenities.manage');
  const initialAmenities = await listAdminAmenitiesWithUsage();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amenities catalogue"
        description="Maintain room facilities, visual icons, and guest features across room types."
      />
      <AmenitiesClient initialAmenities={initialAmenities} />
    </div>
  );
}
