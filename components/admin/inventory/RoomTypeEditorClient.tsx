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

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type {
  AdminRoomTypeDetail,
  AdminRoomTypeInput,
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
  const router = useRouter();
  const [data, setData] = useState<AdminRoomTypeDetail | null>(initialData);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isSaving, setIsSaving] = useState(false);

  const isExisting = !!data?.id;

  async function handleRefresh() {
    if (!data?.id) return;
    try {
      const res = await adminService.getRoomType(data.id);
      if (res.data) {
        setData(res.data);
      }
    } catch {
      // Ignored
    }
  }

  async function handleSaveDetails(input: AdminRoomTypeInput) {
    setIsSaving(true);

    try {
      if (isExisting && data?.id) {
        const res = await adminService.updateRoomType(data.id, input);
        if (res.data) {
          setData(res.data);
          toast.add({
            title: SUCCESS_MESSAGES.ROOM_TYPE_UPDATED,
            type: 'success',
          });
        }
      } else {
        const res = await adminService.createRoomType(input);
        if (res.data) {
          toast.add({
            title: SUCCESS_MESSAGES.ROOM_TYPE_CREATED,
            type: 'success',
          });
          router.push(`/admin/rooms/${res.data.id}`);
        }
      }
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
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!data?.id) return;
    if (
      !confirm(
        'Are you sure you want to delete this room type? If any reservations have ever been booked, deletion will be blocked and you must deactivate it instead.',
      )
    ) {
      return;
    }

    try {
      await adminService.deleteRoomType(data.id);
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
      <div className="border-line flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/rooms"
            className="hover:text-foreground text-muted-foreground flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="size-3.5" /> Back to Room Types
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-foreground font-display text-h2">
              {isExisting ? data?.name : 'New Room Type'}
            </h1>
            {isExisting && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
          className="border-line text-small h-auto w-full justify-start overflow-x-auto rounded-none border-b p-0"
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
