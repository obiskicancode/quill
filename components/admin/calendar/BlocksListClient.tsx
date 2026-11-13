'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useBlocksList,
  useDeleteBlock,
} from '@/hooks/services/admin/use-calendar';
import { formatShort } from '@/lib/dates';
import type { AdminRole } from '@/types/auth.types';
import type {
  BlockReason,
  CalendarBlockBar,
  CalendarRoom,
  RoomBlockListItem,
} from '@/types/calendar.types';

import { BlockModal } from './BlockModal';

interface BlocksListClientProps {
  initialRooms: CalendarRoom[];
  initialRoomTypes: { id: string; name: string; slug: string }[];
  role: AdminRole;
  today: string;
}

/**
 * Paginated blocks list with status/reason filters and edit/delete actions.
 */
export function BlocksListClient({
  initialRooms,
  initialRoomTypes,
  role,
  today,
}: BlocksListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const rawPage = Number(searchParams.get('page'));
  const rawPageSize = Number(searchParams.get('pageSize'));
  const roomTypeParam = searchParams.get('roomTypeId') || '';
  const roomParam = searchParams.get('roomId') || '';
  const reasonParam = searchParams.get('reason');
  const statusParam = searchParams.get('status');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = [25, 50, 100].includes(rawPageSize) ? rawPageSize : 25;
  const roomTypeId = initialRoomTypes.some((rt) => rt.id === roomTypeParam)
    ? roomTypeParam
    : '';
  const roomId = initialRooms.some(
    (r) => r.id === roomParam && (!roomTypeId || r.roomTypeId === roomTypeId),
  )
    ? roomParam
    : '';
  const reason: BlockReason | '' = [
    'maintenance',
    'owner_hold',
    'renovation',
    'other',
  ].includes(reasonParam ?? '')
    ? (reasonParam as BlockReason)
    : '';
  const status: 'all' | 'upcoming' | 'current' | 'past' = [
    'all',
    'upcoming',
    'current',
    'past',
  ].includes(statusParam ?? '')
    ? (statusParam as 'all' | 'upcoming' | 'current' | 'past')
    : 'all';

  const updateQuery = useCallback(
    (
      patch: {
        page?: number;
        pageSize?: number;
        roomTypeId?: string;
        roomId?: string;
        reason?: BlockReason | '';
        status?: 'all' | 'upcoming' | 'current' | 'past';
      },
      resetPage = true,
    ) => {
      const nextPage = patch.page ?? (resetPage ? 1 : page);
      const nextPageSize = patch.pageSize ?? pageSize;
      const nextRoomTypeId = patch.roomTypeId ?? roomTypeId;
      const nextRoomId = patch.roomId ?? roomId;
      const nextReason = patch.reason ?? reason;
      const nextStatus = patch.status ?? status;

      const q = new URLSearchParams();
      if (nextPage > 1) q.set('page', String(nextPage));
      if (nextPageSize !== 25) q.set('pageSize', String(nextPageSize));
      if (nextRoomTypeId) q.set('roomTypeId', nextRoomTypeId);
      if (nextRoomId) q.set('roomId', nextRoomId);
      if (nextReason) q.set('reason', nextReason);
      if (nextStatus !== 'all') q.set('status', nextStatus);

      const str = q.toString();
      router.replace(str ? `${pathname}?${str}` : pathname, {
        scroll: false,
      });
    },
    [page, pageSize, pathname, reason, roomId, roomTypeId, router, status],
  );

  // Modal & Action states
  const ask = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CalendarBlockBar | null>(null);

  const blocksQuery = useBlocksList({
    page,
    pageSize,
    roomTypeId: roomTypeId || undefined,
    roomId: roomId || undefined,
    reason: reason || undefined,
    status,
  });
  const deleteBlock = useDeleteBlock();

  const data = blocksQuery.data ?? null;
  const loading = blocksQuery.isPending && !blocksQuery.data;
  const error = blocksQuery.error
    ? blocksQuery.error instanceof Error
      ? blocksQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_ROOM_BLOCKS
    : null;
  const fetchBlocks = () => {
    void blocksQuery.refetch();
  };

  const handleDelete = (block: RoomBlockListItem) => {
    void ask({
      title: 'Remove this room block?',
      confirmLabel: 'Remove block',
      tone: 'danger',
      description: (
        <>
          Room #{block.roomNumber} ({block.roomTypeName}) is held from{' '}
          {formatShort(block.startDate)} to {formatShort(block.endDate)}. Those
          dates become bookable again as soon as the block is removed.
        </>
      ),
      run: async () => {
        // A rejection carries its own message into the dialog, which stays
        // open so the operator can retry or back out.
        await deleteBlock.mutateAsync(block.id);
        toast.add({
          title: SUCCESS_MESSAGES.ROOM_BLOCK_REMOVED,
          type: 'success',
        });
      },
    });
  };

  const handleEdit = (item: RoomBlockListItem) => {
    setBlockToEdit({
      id: item.id,
      roomId: item.roomId,
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
      notes: item.notes,
      createdByName: item.createdByName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
    setModalOpen(true);
  };

  const filteredRooms = roomTypeId
    ? initialRooms.filter((r) => r.roomTypeId === roomTypeId)
    : initialRooms;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <Link
        href="/admin/calendar"
        className="inline-flex min-h-11 items-center gap-1 text-caption text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        <span>Back to calendar</span>
      </Link>

      <PageHeader
        title="Room blocks"
        description="Manage administrative room blocks and maintenance holds."
        actions={
          <Button
            type="button"
            onClick={() => {
              setBlockToEdit(null);
              setModalOpen(true);
            }}
            icon={<Plus className="size-4" aria-hidden />}
          >
            New room block
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center rounded-control border border-line bg-muted p-0.5">
            {(['all', 'upcoming', 'current', 'past'] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant={status === s ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => updateQuery({ status: s })}
                aria-pressed={status === s}
                className={`capitalize ${
                  status === s
                    ? 'font-semibold shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                {s}
              </Button>
            ))}
          </div>

          {/* Room Type */}
          <Select
            items={[
              { value: 'all', label: 'All Room Types' },
              ...initialRoomTypes.map((rt) => ({
                value: rt.id,
                label: rt.name,
              })),
            ]}
            value={roomTypeId || 'all'}
            onValueChange={(val) =>
              updateQuery({
                roomTypeId: val === 'all' || !val ? '' : val,
                roomId: '',
              })
            }
          >
            <SelectTrigger aria-label="Filter by room type" className="w-37.5">
              <SelectValue placeholder="All Room Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Room Types</SelectItem>
              {initialRoomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Room */}
          <Select
            items={[
              { value: 'all', label: 'All Rooms' },
              ...filteredRooms.map((r) => ({
                value: r.id,
                label: `#${r.roomNumber} (${r.roomTypeName})`,
              })),
            ]}
            value={roomId || 'all'}
            onValueChange={(val) =>
              updateQuery({
                roomId: val === 'all' || !val ? '' : val,
              })
            }
          >
            <SelectTrigger aria-label="Filter by room" className="w-40">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {filteredRooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  #{r.roomNumber} ({r.roomTypeName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reason */}
          <Select
            items={[
              { value: 'all', label: 'All Reasons' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'owner_hold', label: 'Owner Hold' },
              { value: 'renovation', label: 'Renovation' },
              { value: 'other', label: 'Other Operations' },
            ]}
            value={reason || 'all'}
            onValueChange={(val) =>
              updateQuery({
                reason: val === 'all' || !val ? '' : (val as BlockReason),
              })
            }
          >
            <SelectTrigger aria-label="Filter by reason" className="w-37.5">
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="owner_hold">Owner Hold</SelectItem>
              <SelectItem value="renovation">Renovation</SelectItem>
              <SelectItem value="other">Other Operations</SelectItem>
            </SelectContent>
          </Select>

          {(roomTypeId || roomId || reason || status !== 'all') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                updateQuery({
                  roomTypeId: '',
                  roomId: '',
                  reason: '',
                  status: 'all',
                })
              }
              className="h-8 px-2 text-caption text-muted-foreground hover:text-ink"
            >
              Clear filters
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={fetchBlocks}
          className="px-2"
          aria-label="Refresh room block list"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Blocks Table */}
      {loading ? (
        <AdminLoading label="Loading room blocks..." />
      ) : error ? (
        <AdminError
          message={error}
          action={
            <Button type="button" variant="secondary" onClick={fetchBlocks}>
              Retry
            </Button>
          }
        />
      ) : !data || data.blocks.length === 0 ? (
        <AdminEmpty title="No room blocks found">
          {roomTypeId || roomId || reason || status !== 'all'
            ? 'No room blocks match the selected filters. Clear them to see the full list.'
            : 'No administrative room blocks exist on this property yet.'}
        </AdminEmpty>
      ) : (
        <div className="rounded-card border border-line bg-paper shadow-xs">
          <div className="overflow-x-auto">
            <Table className="w-full border-collapse text-left text-small">
              <TableHeader>
                <TableRow className="border-b border-line bg-muted/60 text-caption font-semibold tracking-wider text-muted-foreground uppercase hover:bg-transparent">
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Room
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Dates & Nights
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Reason
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Notes
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Created By
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-right text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-line/60">
                {data.blocks.map((b) => (
                  <TableRow
                    key={b.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">
                          #{b.roomNumber}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          ({b.roomTypeName})
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 font-mono text-caption text-ink">
                      <div>
                        {formatShort(b.startDate)} → {formatShort(b.endDate)}
                      </div>
                      <div className="text-caption text-muted-foreground">
                        {b.nights} night(s)
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="destructive"
                        className="rounded-control border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-caption font-semibold text-destructive uppercase"
                      >
                        {b.reason.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-xs truncate px-4 py-3 text-caption text-muted-foreground">
                      {b.notes || '—'}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-caption text-muted-foreground">
                      <div>{b.createdByName || 'Staff'}</div>
                      <div className="font-mono text-caption">
                        {formatShort(b.createdAt.slice(0, 10))}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEdit(b)}
                          aria-label={`Edit the block on room #${b.roomNumber}`}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(b)}
                          aria-label={`Remove the block on room #${b.roomNumber} from ${formatShort(b.startDate)} to ${formatShort(b.endDate)}`}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-muted/30 px-4 py-3 text-caption text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing {data.blocks.length} of {data.total} room block(s)
              </span>
              <Select
                items={[
                  { value: '25', label: '25 / page' },
                  { value: '50', label: '50 / page' },
                  { value: '100', label: '100 / page' },
                ]}
                value={String(pageSize)}
                onValueChange={(val) => {
                  if (val) updateQuery({ pageSize: Number(val) });
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Select rows per page"
                  className="w-25"
                >
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      updateQuery({ page: Math.max(1, page - 1) }, false)
                    }
                    disabled={page <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-caption font-medium text-muted-foreground">
                    Page {data.page} of {Math.max(1, data.totalPages)}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => updateQuery({ page: page + 1 }, false)}
                    disabled={page >= data.totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {modalOpen && (
        <BlockModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setBlockToEdit(null);
          }}
          onSuccess={() => fetchBlocks()}
          role={role}
          today={today}
          rooms={initialRooms}
          roomTypes={initialRoomTypes}
          blockToEdit={blockToEdit}
        />
      )}
    </div>
  );
}
