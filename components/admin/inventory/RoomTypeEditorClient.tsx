'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DoorOpen,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCreateRoomType,
  useDeleteRoomType,
  useRoomType,
  useUpdateRoomType,
} from '@/hooks/services/admin/use-inventory';
import type {
  AdminRoomTypeDetail,
  RoomTypeInput,
} from '@/types/inventory.types';

import { TabAmenities } from './TabAmenities';
import { TabDetails } from './TabDetails';
import { TabPhotos } from './TabPhotos';
import { TabPricePreview } from './TabPricePreview';
import { TabRooms } from './TabRooms';

interface RoomTypeEditorClientProps {
  initialData: AdminRoomTypeDetail | null;
  currentRole: 'owner' | 'manager' | 'reception';
}

type TabKey = 'details' | 'photos' | 'amenities' | 'rooms' | 'pricing';

export function RoomTypeEditorClient({
  initialData,
  currentRole,
}: RoomTypeEditorClientProps) {
  const confirm = useConfirm();
  const router = useRouter();
  const roomTypeQuery = useRoomType(initialData?.id, initialData);
  const createRoomType = useCreateRoomType();
  const updateRoomType = useUpdateRoomType(initialData?.id ?? '');
  const deleteRoomType = useDeleteRoomType();
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const data: AdminRoomTypeDetail | null =
    roomTypeQuery.data ?? initialData ?? null;
  const isExisting = !!data?.id;
  const isSaving = createRoomType.isPending || updateRoomType.isPending;

  async function handleRefresh() {
    if (!data?.id) return;
    try {
      await roomTypeQuery.refetch();
    } catch {
      // Ignored
    }
  }

  async function handleSaveDetails(input: RoomTypeInput): Promise<boolean> {
    try {
      if (isExisting && data?.id) {
        const updated = await updateRoomType.mutateAsync(input);
        if (updated) {
          toast.add({
            title: SUCCESS_MESSAGES.ROOM_TYPE_UPDATED,
            type: 'success',
          });
        }
      } else {
        const created = await createRoomType.mutateAsync(input);
        if (created) {
          toast.add({
            title: SUCCESS_MESSAGES.ROOM_TYPE_CREATED,
            type: 'success',
          });
          router.push(`/admin/rooms/${created.id}`);
        }
      }
      return true;
    } catch (err: unknown) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : isExisting
              ? ERROR_MESSAGES.FAILED_TO_UPDATE_ROOM_TYPE
              : ERROR_MESSAGES.FAILED_TO_CREATE_ROOM_TYPE,
        type: 'error',
        priority: 'high',
      });
      return false;
    }
  }

  async function handleDelete() {
    if (!data?.id) return;
    const sure = await confirm({
      title: 'Delete this room type?',
      description:
        'If any reservations have ever been booked on it, deletion will be blocked and you must deactivate it instead.',
      confirmLabel: 'Delete room type',
      tone: 'danger',
    });
    if (!sure) return;

    try {
      await deleteRoomType.mutateAsync(data.id);
      toast.add({ title: SUCCESS_MESSAGES.ROOM_TYPE_DELETED, type: 'success' });
      router.push('/admin/rooms');
    } catch (err) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_DELETE_ROOM_TYPE,
        type: 'error',
        priority: 'high',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/rooms"
            className="flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Room Types
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-h2 text-foreground">
              {isExisting ? data?.name : 'New Room Type'}
            </h1>
            {isExisting && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-caption font-medium ${
                  data?.isActive
                    ? 'bg-success/15 text-success'
                    : 'bg-muted/20 text-muted-foreground'
                }`}
              >
                {data?.isActive ? 'Active' : 'Draft / Inactive'}
              </span>
            )}
          </div>
        </div>

        {isExisting && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-3.5" /> Delete Room Type
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabKey)}
        className="w-full"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-line p-0 text-small"
        >
          <TabsTrigger value="details" className="gap-2 px-4 py-2.5">
            <FileText className="size-4" /> Details
          </TabsTrigger>

          {isExisting && (
            <>
              <TabsTrigger value="photos" className="gap-2 px-4 py-2.5">
                <ImageIcon className="size-4" /> Photos (
                {data?.photos.length ?? 0}/8)
              </TabsTrigger>

              <TabsTrigger value="amenities" className="gap-2 px-4 py-2.5">
                <Sparkles className="size-4" /> Amenities (
                {data?.amenityIds.length ?? 0})
              </TabsTrigger>

              <TabsTrigger value="rooms" className="gap-2 px-4 py-2.5">
                <DoorOpen className="size-4" /> Units ({data?.rooms.length ?? 0}
                )
              </TabsTrigger>

              <TabsTrigger value="pricing" className="gap-2 px-4 py-2.5">
                <Calendar className="size-4" /> Price Preview
              </TabsTrigger>
            </>
          )}
        </TabsList>
      </Tabs>

      {/* Tab Panels */}
      <div>
        {activeTab === 'details' && (
          <TabDetails
            initialData={data}
            onSave={handleSaveDetails}
            isSaving={isSaving}
            currentRole={currentRole}
          />
        )}

        {isExisting && data?.id && activeTab === 'photos' && (
          <TabPhotos
            roomTypeId={data.id}
            initialPhotos={data.photos}
            onRefresh={handleRefresh}
          />
        )}

        {isExisting && data?.id && activeTab === 'amenities' && (
          <TabAmenities
            roomTypeId={data.id}
            assignedAmenityIds={data.amenityIds}
            onRefresh={handleRefresh}
          />
        )}

        {isExisting && data?.id && activeTab === 'rooms' && (
          <TabRooms
            roomTypeId={data.id}
            initialRooms={data.rooms}
            onRefresh={handleRefresh}
          />
        )}

        {isExisting && data?.id && activeTab === 'pricing' && (
          <TabPricePreview roomTypeId={data.id} />
        )}
      </div>
    </div>
  );
}
