import { RoomTypesListClient } from '@/components/admin/inventory/RoomTypesListClient';
import { PageHeader } from '@/components/admin/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { listAdminRoomTypes } from '@/lib/db/repositories/inventory.repo';

export const metadata = {
  title: 'Room Types | Admin',
};

export default async function AdminRoomsPage() {
  const context = await requireAdminPage('rooms.view');
  const initialRoomTypes = await listAdminRoomTypes();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room types"
        description="Manage accommodation categories, nightly pricing, photos, amenities, and room units."
      />
      <RoomTypesListClient
        initialRoomTypes={initialRoomTypes}
        currentRole={context.role}
      />
    </div>
  );
}
