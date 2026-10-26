import { RoomTypeEditorClient } from '@/components/admin/inventory/RoomTypeEditorClient';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata = {
  title: 'New Room Type | Admin',
};

export default async function NewRoomTypePage() {
  const context = await requireAdminPage('rooms.manage');

  return <RoomTypeEditorClient initialData={null} currentRole={context.role} />;
}
