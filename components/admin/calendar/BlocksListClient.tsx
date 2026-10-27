'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
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
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatShort } from '@/lib/dates';
import type { AdminRole } from '@/types/auth.types';
import type {
  BlockReason,
  CalendarBlockBar,
  CalendarRoom,
  RoomBlockListItem,
  RoomBlocksListResponse,
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
  const searchParams = useSearchParams();

  // URL state
  const pageParam = Number(searchParams.get('page')) || 1;
  const pageSizeParam = Number(searchParams.get('pageSize')) || 25;
  const roomTypeParam = searchParams.get('roomTypeId') || '';
  const roomParam = searchParams.get('roomId') || '';
  const reasonParam = (searchParams.get('reason') as BlockReason) || '';
  const statusParam =
    (searchParams.get('status') as 'all' | 'upcoming' | 'current' | 'past') ||
    'all';

  const [page, setPage] = useState(pageParam);
  const [pageSize, setPageSize] = useState(pageSizeParam);
  const [roomTypeId, setRoomTypeId] = useState(roomTypeParam);
  const [roomId, setRoomId] = useState(roomParam);
  const [reason, setReason] = useState<BlockReason | ''>(reasonParam);
  const [status, setStatus] = useState<'all' | 'upcoming' | 'current' | 'past'>(
    statusParam,
  );

  const [data, setData] = useState<RoomBlocksListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Action states
  const [modalOpen, setModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CalendarBlockBar | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch list
  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listBlocks({
        page,
        pageSize,
        roomTypeId: roomTypeId || undefined,
        roomId: roomId || undefined,
        reason: reason || undefined,
        status,
      });
      setData(res.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_LOAD_ROOM_BLOCKS,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    // Sync to URL
    const q = new URLSearchParams();
    if (page > 1) q.set('page', String(page));
    if (pageSize !== 25) q.set('pageSize', String(pageSize));
    if (roomTypeId) q.set('roomTypeId', roomTypeId);
    if (roomId) q.set('roomId', roomId);
    if (reason) q.set('reason', reason);
    if (status !== 'all') q.set('status', status);

    const str = q.toString();
    router.replace(`/admin/calendar/blocks${str ? `?${str}` : ''}`, {
      scroll: false,
    });

    const run = async () => {
      try {
        const res = await adminService.listBlocks({
          page,
          pageSize,
          roomTypeId: roomTypeId || undefined,
          roomId: roomId || undefined,
          reason: reason || undefined,
          status,
        });
        if (active) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : ERROR_MESSAGES.FAILED_TO_LOAD_ROOM_BLOCKS,
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [page, pageSize, roomTypeId, roomId, reason, status, router]);

  // Delete Action
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await adminService.deleteBlock(id);
      setDeletingId(null);
      fetchBlocks();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_DELETE_BLOCK,
      );
    } finally {
      setDeleting(false);
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
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/calendar"
              className="text-caption text-muted-foreground hover:text-ink inline-flex items-center gap-1 focus:outline-hidden"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Calendar</span>
            </Link>
          </div>
          <h1 className="text-h2 text-ink mt-1 font-serif font-semibold">
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
      <div className="rounded-card border-line bg-paper flex flex-wrap items-center justify-between gap-3 border p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="bg-muted rounded-control border-line flex items-center border p-0.5">
            {(['all', 'upcoming', 'current', 'past'] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant={status === s ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
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
            onValueChange={(val) => {
              setRoomTypeId(val === 'all' || !val ? '' : val);
              setRoomId('');
              setPage(1);
            }}
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
            onValueChange={(val) => {
              setRoomId(val === 'all' || !val ? '' : val);
              setPage(1);
            }}
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
            onValueChange={(val) => {
              setReason(val === 'all' || !val ? '' : (val as BlockReason));
              setPage(1);
            }}
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
              onClick={() => {
                setRoomTypeId('');
                setRoomId('');
                setReason('');
                setStatus('all');
                setPage(1);
              }}
              className="text-muted-foreground hover:text-ink h-8 px-2 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
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
        <div className="rounded-card border-destructive/40 bg-destructive/10 flex items-center justify-between border p-3.5">
          <div className="text-small text-destructive flex items-center gap-2">
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
        </div>
      )}

      {/* Blocks Table */}
      {loading ? (
        <div className="rounded-card border-line bg-paper flex h-64 items-center justify-center border">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-card border-destructive/30 bg-paper flex h-64 flex-col items-center justify-center border p-6 text-center">
          <AlertCircle className="text-destructive size-8" />
          <p className="text-small text-destructive mt-2">{error}</p>
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
        <div className="rounded-card border-line bg-paper flex h-64 flex-col items-center justify-center border p-6 text-center">
          <ShieldAlert className="text-muted-foreground size-8" />
          <h3 className="text-small text-ink mt-2 font-semibold">
            No Room Blocks Found
          </h3>
          <p className="text-caption text-muted-foreground mt-1">
            {roomTypeId || roomId || reason || status !== 'all'
              ? 'No room blocks match the selected filter criteria.'
              : 'No administrative room blocks currently exist on this property.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border-line bg-paper overflow-hidden border shadow-xs">
          <Table className="text-small w-full border-collapse text-left">
            <TableHeader>
              <TableRow className="bg-muted/60 border-line text-caption text-muted-foreground border-b font-semibold tracking-wider uppercase hover:bg-transparent">
                <TableHead className="text-muted-foreground px-4 py-2.5">
                  Room
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-2.5">
                  Dates & Nights
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-2.5">
                  Reason
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-2.5">
                  Notes
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-2.5">
                  Created By
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-2.5 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-line/60 divide-y">
              {data.blocks.map((b) => (
                <TableRow
                  key={b.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-ink px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold">
                        #{b.roomNumber}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        ({b.roomTypeName})
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-caption text-ink px-4 py-3 font-mono">
                    <div>
                      {formatShort(b.startDate)} → {formatShort(b.endDate)}
                    </div>
                    <div className="text-muted-foreground text-caption">
                      {b.nights} night(s)
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="destructive"
                      className="rounded-control border-destructive/40 bg-destructive/10 text-destructive text-caption border px-2 py-0.5 font-mono font-semibold uppercase"
                    >
                      {b.reason.replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-caption text-muted-foreground max-w-xs truncate px-4 py-3">
                    {b.notes || '—'}
                  </TableCell>

                  <TableCell className="text-caption text-muted-foreground px-4 py-3">
                    <div>{b.createdByName || 'Staff'}</div>
                    <div className="text-caption font-mono">
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
          <div className="bg-muted/30 border-line text-caption text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
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
                  if (val) {
                    setPageSize(Number(val));
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Select rows per page"
                  className="w-[6.25rem]"
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-caption text-muted-foreground px-2 font-medium">
                    Page {data.page} of {Math.max(1, data.totalPages)}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => p + 1)}
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
