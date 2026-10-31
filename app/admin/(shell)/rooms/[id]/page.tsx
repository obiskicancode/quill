import { notFound } from 'next/navigation';

import { RoomTypeEditorClient } from '@/components/admin/inventory/RoomTypeEditorClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { getAdminRoomTypeById } from '@/lib/db/repositories/inventory.repo';

export const metadata = {
  title: 'Edit Room Type | Admin',
};

export default async function EditRoomTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireAdminPage('rooms.manage');
  const { id } = await params;
  const roomType = await getAdminRoomTypeById(id);

  if (!roomType) {
    notFound();
  }

  return (
    <RoomTypeEditorClient initialData={roomType} currentRole={context.role} />
  );
}
