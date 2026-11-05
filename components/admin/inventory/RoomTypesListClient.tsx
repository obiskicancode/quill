'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Hotel,
  Plus,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { MAX_ROOM_TYPES } from '@/constants/inventory';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useReorderRoomTypes,
  useRoomTypes,
} from '@/hooks/services/admin/use-inventory';
import { queryKeys } from '@/hooks/services/query-keys';
import { formatMinor } from '@/lib/format';
import type { AdminRoomTypeListItem } from '@/types/inventory.types';

interface RoomTypesListClientProps {
  initialRoomTypes: AdminRoomTypeListItem[];
  currentRole: 'owner' | 'manager' | 'reception';
}

export function RoomTypesListClient({
  initialRoomTypes,
  currentRole,
}: RoomTypesListClientProps) {
  const roomTypesQuery = useRoomTypes(initialRoomTypes);
  const reorderRoomTypes = useReorderRoomTypes();
  const queryClient = useQueryClient();
  const roomTypes = roomTypesQuery.data ?? initialRoomTypes;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const loading = roomTypesQuery.isFetching;
  const error =
    mutationError ??
    (roomTypesQuery.error instanceof Error
      ? roomTypesQuery.error.message
      : roomTypesQuery.error
        ? ERROR_MESSAGES.FAILED_TO_RELOAD_ROOM_TYPES
        : null);

  const isOwner = currentRole === 'owner';
  const atLimit = roomTypes.length >= MAX_ROOM_TYPES;

  async function refresh() {
    setMutationError(null);
    await roomTypesQuery.refetch();
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roomTypes.length) return;

    const previous = roomTypes;
    const updated = [...roomTypes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Assign new sequential sort orders
    const items = updated.map((rt, idx) => ({
      id: rt.id,
      sortOrder: idx + 1,
    }));

    queryClient.setQueryData(queryKeys.admin.inventory.roomTypes(), updated);
    setReordering(true);

    try {
      await reorderRoomTypes.mutateAsync(items);
      toast.add({
        title: SUCCESS_MESSAGES.ROOM_TYPES_REORDERED,
        type: 'success',
      });
    } catch {
      queryClient.setQueryData(queryKeys.admin.inventory.roomTypes(), previous);
      setMutationError(ERROR_MESSAGES.FAILED_TO_UPDATE_SORT_ORDER);
      await refresh();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Soft Limit Alert Banner */}
      {atLimit && (
        <Alert
          variant="warning"
          size="panel"
          role="region"
          aria-label="Room type limit warning"
          className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Maximum Room Types Reached ({roomTypes.length} of{' '}
                {MAX_ROOM_TYPES})
              </p>
              <p className="text-muted-foreground">
                The boutique design standard recommends up to {MAX_ROOM_TYPES}{' '}
                room types.
                {isOwner
                  ? ' As an Owner, you may create additional room types if necessary.'
                  : ERROR_MESSAGES.ROOM_TYPE_LIMIT_OWNER_ONLY}
              </p>
            </div>
          </div>
          {isOwner && (
            <Link href="/admin/rooms/new">
              <Button
                size="sm"
                variant="secondary"
                className="whitespace-nowrap"
              >
                Owner Override: Add Type
              </Button>
            </Link>
          )}
        </Alert>
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-small text-muted-foreground">
          Showing {roomTypes.length}{' '}
          {roomTypes.length === 1 ? 'room type' : 'room types'}. Order matches
          guest display on public website.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh list"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link
            href="/admin/rooms/new"
            aria-disabled={atLimit && !isOwner}
            tabIndex={atLimit && !isOwner ? -1 : undefined}
            className={atLimit && !isOwner ? 'pointer-events-none' : ''}
          >
            <Button
              size="sm"
              disabled={atLimit && !isOwner}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              New Room Type
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <AdminError
          message={error}
          action={
            <Button size="sm" variant="secondary" onClick={refresh}>
              Retry
            </Button>
          }
        />
      )}

      {loading && roomTypes.length === 0 ? (
        <AdminLoading label="Loading room types..." />
      ) : roomTypes.length === 0 ? (
        <AdminEmpty title="Add your first room type">
          Create room categories, bed layouts, and nightly rates for guest
          reservations.
          <div className="mt-4">
            <Link href="/admin/rooms/new">
              <Button size="sm">Create Room Type</Button>
            </Link>
          </div>
        </AdminEmpty>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-card">
          <Table className="w-full text-left text-small">
            <TableHeader className="border-b border-line bg-paper text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 pr-2 pl-4 font-medium">
                  Order
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Room Type
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Base Price (₦)
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Units</TableHead>
                <TableHead className="px-4 py-3 font-medium">Photos</TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Public Status
                </TableHead>
                <TableHead className="py-3 pr-6 pl-4 text-right font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-line">
              {roomTypes.map((rt, idx) => (
                <TableRow
                  key={rt.id}
                  className="transition-colors hover:bg-paper/40"
                >
                  {/* Order controls */}
                  <TableCell className="py-3 pr-2 pl-4">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0 || reordering}
                        aria-label={`Move ${rt.name} up`}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === roomTypes.length - 1 || reordering}
                        aria-label={`Move ${rt.name} down`}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <span className="w-5 text-center text-caption text-muted-foreground">
                        {idx + 1}
                      </span>
                    </div>
                  </TableCell>

                  {/* Room Type info */}
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-sm border border-line bg-paper">
                        {rt.coverImageUrl ? (
                          <Image
                            src={rt.coverImageUrl}
                            alt={rt.coverImageAlt || rt.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Hotel className="size-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/rooms/${rt.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {rt.name}
                        </Link>
                        <p className="text-caption text-muted-foreground">
                          /{rt.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Base Price */}
                  <TableCell className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-foreground">
                        {formatMinor(rt.basePriceMinor)}
                      </span>
                      {rt.weekendPriceMinor && (
                        <p className="text-caption text-muted-foreground">
                          Wknd: {formatMinor(rt.weekendPriceMinor)}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Units */}
                  <TableCell className="px-4 py-3">
                    <Badge variant={rt.activeRooms > 0 ? 'success' : 'neutral'}>
                      {rt.activeRooms} of {rt.totalRooms} active
                    </Badge>
                  </TableCell>

                  {/* Photos */}
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {rt.photoCount} / 8
                  </TableCell>

                  {/* Public Status */}
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center gap-1 text-caption font-medium ${
                          rt.isActive ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            rt.isActive ? 'bg-success' : 'bg-muted'
                          }`}
                        />
                        {rt.isActive ? 'Active' : 'Draft / Inactive'}
                      </span>
                      {rt.showPrice ? (
                        <span className="flex items-center gap-1 text-caption text-muted-foreground">
                          <Eye className="size-3 text-brand" /> Price visible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-caption text-muted-foreground">
                          <EyeOff className="size-3 text-muted-foreground" />{' '}
                          Price hidden
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 pr-6 pl-4 text-right">
                    <Link href={`/admin/rooms/${rt.id}`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
