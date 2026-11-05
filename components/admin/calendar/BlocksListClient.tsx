'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CalendarBlockBar | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  const deleting = deleteBlock.isPending;

  const fetchBlocks = () => {
    void blocksQuery.refetch();
  };

  // Delete Action
  const handleDelete = async (id: string) => {
    try {
      await deleteBlock.mutateAsync(id);
      toast.add({
        title: SUCCESS_MESSAGES.ROOM_BLOCK_REMOVED,
        type: 'success',
      });
      setDeletingId(null);
    } catch (err) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_DELETE_BLOCK,
        type: 'error',
        priority: 'high',
      });
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/calendar"
              className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-ink focus:outline-hidden"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Calendar</span>
            </Link>
          </div>
          <h1 className="mt-1 font-serif text-h2 font-semibold text-ink">
            Room Blocks
          </h1>
          <p className="text-small text-muted-foreground">
            Manage administrative room blocks and maintenance holds
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setBlockToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus className="size-4" />
          <span>New Room Block</span>
        </Button>
      </div>

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
          title="Refresh list"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Delete Confirmation Alert */}
      {deletingId && (
        <Alert
          variant="destructive"
          size="panel"
          className="grid-cols-[1fr_auto] items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              Are you sure you want to remove this block? Dates will become
              available again immediately.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={deleting}
              onClick={() => handleDelete(deletingId)}
            >
              {deleting ? 'Removing...' : 'Confirm'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
          </div>
        </Alert>
      )}

      {/* Blocks Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-card border border-line bg-paper">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-card border border-destructive/30 bg-paper p-6 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="mt-2 text-small text-destructive">{error}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={fetchBlocks}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      ) : !data || data.blocks.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-card border border-line bg-paper p-6 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
          <h3 className="mt-2 text-small font-semibold text-ink">
            No Room Blocks Found
          </h3>
          <p className="mt-1 text-caption text-muted-foreground">
            {roomTypeId || roomId || reason || status !== 'all'
              ? 'No room blocks match the selected filter criteria.'
              : 'No administrative room blocks currently exist on this property.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-paper shadow-xs">
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
                        title="Edit block"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeletingId(b.id)}
                        title="Remove block"
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
