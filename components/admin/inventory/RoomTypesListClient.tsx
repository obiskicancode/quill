'use client';

import Image from 'next/image';
import Link from 'next/link';
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

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
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
import { MAX_ROOM_TYPES } from '@/constants/inventory';
import { minorToNaira } from '@/lib/rate-resolution';
import type { AdminRoomTypeListItem } from '@/types/inventory.types';

interface RoomTypesListClientProps {
  initialRoomTypes: AdminRoomTypeListItem[];
  currentRole: 'owner' | 'manager' | 'reception';
}

export function RoomTypesListClient({
  initialRoomTypes,
  currentRole,
}: RoomTypesListClientProps) {
  const [roomTypes, setRoomTypes] =
    useState<AdminRoomTypeListItem[]>(initialRoomTypes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const isOwner = currentRole === 'owner';
  const atLimit = roomTypes.length >= MAX_ROOM_TYPES;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listRoomTypes();
      if (res.data) {
        setRoomTypes(res.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reload room types',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roomTypes.length) return;

    const updated = [...roomTypes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Assign new sequential sort orders
    const items = updated.map((rt, idx) => ({
      id: rt.id,
      sortOrder: idx + 1,
    }));

    setRoomTypes(updated);
    setReordering(true);

    try {
      await adminService.reorderRoomTypes(items);
    } catch {
      setError('Failed to update sort order. Refreshing list.');
      await refresh();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Soft Limit Alert Banner */}
      {atLimit && (
        <div
          role="region"
          aria-label="Room type limit warning"
          className="border-warning/40 bg-warning/10 rounded-card text-small flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-warning mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-warning-contrast font-semibold">
                Maximum Room Types Reached ({roomTypes.length} of{' '}
                {MAX_ROOM_TYPES})
              </p>
              <p className="text-muted-foreground">
                The boutique design standard recommends up to {MAX_ROOM_TYPES}{' '}
                room types.
                {isOwner
                  ? ' As an Owner, you may create additional room types if necessary.'
                  : ' Only an Owner can exceed this limit.'}
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
        </div>
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
        <div className="rounded-card border-line bg-card overflow-hidden border">
          <Table className="text-small w-full text-left">
            <TableHeader className="border-line bg-paper text-muted-foreground border-b">
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
            <TableBody className="divide-line divide-y">
              {roomTypes.map((rt, idx) => (
                <TableRow
                  key={rt.id}
                  className="hover:bg-paper/40 transition-colors"
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
                      <span className="text-muted-foreground w-5 text-center text-xs">
                        {idx + 1}
                      </span>
                    </div>
                  </TableCell>

                  {/* Room Type info */}
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="border-line bg-paper relative size-12 shrink-0 overflow-hidden rounded border">
                        {rt.coverImageUrl ? (
                          <Image
                            src={rt.coverImageUrl}
                            alt={rt.coverImageAlt || rt.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="text-muted-foreground flex size-full items-center justify-center">
                            <Hotel className="size-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/rooms/${rt.id}`}
                          className="text-foreground font-medium hover:underline"
                        >
                          {rt.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          /{rt.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Base Price */}
                  <TableCell className="px-4 py-3">
                    <div>
                      <span className="text-foreground font-semibold">
                        ₦{minorToNaira(rt.basePriceMinor)}
                      </span>
                      {rt.weekendPriceMinor && (
                        <p className="text-muted-foreground text-xs">
                          Wknd: ₦{minorToNaira(rt.weekendPriceMinor)}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Units */}
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        rt.activeRooms > 0
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-muted/30 bg-muted/15 text-muted-foreground'
                      }`}
                    >
                      {rt.activeRooms} of {rt.totalRooms} active
                    </Badge>
                  </TableCell>

                  {/* Photos */}
                  <TableCell className="text-muted-foreground px-4 py-3">
                    {rt.photoCount} / 8
                  </TableCell>

                  {/* Public Status */}
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center gap-1 text-xs font-medium ${
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
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Eye className="text-brand size-3" /> Price visible
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <EyeOff className="text-muted-foreground size-3" />{' '}
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
