'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import type { AdminRole } from '@/lib/auth/permissions';
import { formatShort } from '@/lib/dates';
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
        err instanceof Error ? err.message : 'Failed to load room blocks.',
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
            err instanceof Error ? err.message : 'Failed to load room blocks.',
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
        err instanceof Error ? err.message : 'Failed to delete room block.',
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
              className="text-caption text-muted hover:text-ink inline-flex items-center gap-1 focus:outline-hidden"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Calendar</span>
            </Link>
          </div>
          <h1 className="text-h2 text-ink mt-1 font-serif font-semibold">
            Room Blocks
          </h1>
          <p className="text-small text-muted">
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
          <div className="bg-canvas rounded-control border-line flex items-center border p-0.5">
            {(['all', 'upcoming', 'current', 'past'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`rounded-control text-caption px-2.5 py-1 font-medium capitalize transition-colors focus:outline-hidden ${
                  status === s
                    ? 'bg-paper text-ink shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Room Type */}
          <select
            value={roomTypeId}
            onChange={(e) => {
              setRoomTypeId(e.target.value);
              setRoomId('');
              setPage(1);
            }}
            aria-label="Filter by room type"
            className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink border px-2.5 py-1 font-medium focus:outline-hidden"
          >
            <option value="">All Room Types</option>
            {initialRoomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          {/* Room */}
          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by room"
            className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink border px-2.5 py-1 font-medium focus:outline-hidden"
          >
            <option value="">All Rooms</option>
            {filteredRooms.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.roomNumber} ({r.roomTypeName})
              </option>
            ))}
          </select>

          {/* Reason */}
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as BlockReason | '');
              setPage(1);
            }}
            aria-label="Filter by reason"
            className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink border px-2.5 py-1 font-medium focus:outline-hidden"
          >
            <option value="">All Reasons</option>
            <option value="maintenance">Maintenance</option>
            <option value="owner_hold">Owner Hold</option>
            <option value="renovation">Renovation</option>
            <option value="other">Other Operations</option>
          </select>

          {(roomTypeId || roomId || reason || status !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setRoomTypeId('');
                setRoomId('');
                setReason('');
                setStatus('all');
                setPage(1);
              }}
              className="text-caption text-muted hover:text-ink underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={fetchBlocks}
          className="hover:bg-canvas rounded-control text-muted hover:text-ink p-1.5 focus:outline-hidden"
          title="Refresh list"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Delete Confirmation Alert */}
      {deletingId && (
        <div className="rounded-card border-danger/40 bg-danger/10 flex items-center justify-between border p-3.5">
          <div className="text-small text-danger flex items-center gap-2">
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
          <Loader2 className="text-muted size-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-card border-danger/30 bg-paper flex h-64 flex-col items-center justify-center border p-6 text-center">
          <AlertCircle className="text-danger size-8" />
          <p className="text-small text-danger mt-2">{error}</p>
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
          <ShieldAlert className="text-muted size-8" />
          <h3 className="text-small text-ink mt-2 font-semibold">
            No Room Blocks Found
          </h3>
          <p className="text-caption text-muted mt-1">
            {roomTypeId || roomId || reason || status !== 'all'
              ? 'No room blocks match the selected filter criteria.'
              : 'No administrative room blocks currently exist on this property.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border-line bg-paper overflow-hidden border shadow-xs">
          <div className="overflow-x-auto">
            <table className="text-small w-full border-collapse text-left">
              <thead>
                <tr className="bg-canvas/60 border-line text-caption text-muted border-b font-semibold tracking-wider uppercase">
                  <th className="px-4 py-2.5">Room</th>
                  <th className="px-4 py-2.5">Dates & Nights</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5">Created By</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-line/60 divide-y">
                {data.blocks.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-canvas/30 transition-colors"
                  >
                    <td className="text-ink px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">
                          #{b.roomNumber}
                        </span>
                        <span className="text-caption text-muted">
                          ({b.roomTypeName})
                        </span>
                      </div>
                    </td>

                    <td className="text-caption text-ink px-4 py-3 font-mono">
                      <div>
                        {formatShort(b.startDate)} → {formatShort(b.endDate)}
                      </div>
                      <div className="text-muted text-[11px]">
                        {b.nights} night(s)
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-control border-danger/40 bg-danger/10 text-danger border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase">
                        {b.reason.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="text-caption text-muted max-w-xs truncate px-4 py-3">
                      {b.notes || '—'}
                    </td>

                    <td className="text-caption text-muted px-4 py-3">
                      <div>{b.createdByName || 'Staff'}</div>
                      <div className="font-mono text-[10px]">
                        {formatShort(b.createdAt.slice(0, 10))}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(b)}
                          title="Edit block"
                          className="hover:bg-canvas rounded-control text-muted hover:text-ink p-1.5 transition-colors focus:outline-hidden"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(b.id)}
                          title="Remove block"
                          className="rounded-control text-danger/80 hover:bg-danger/10 hover:text-danger p-1.5 transition-colors focus:outline-hidden"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-canvas/30 border-line text-caption text-muted flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <div className="flex items-center gap-3">
              <span>
                Showing {data.blocks.length} of {data.total} room block(s)
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Select rows per page"
                className="rounded-control border-line bg-paper text-caption text-ink border px-2 py-0.5 font-medium focus:outline-hidden"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-control border-line bg-paper text-muted hover:text-ink border p-1 transition-colors focus:outline-hidden disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span>
                Page {data.page} of {Math.max(1, data.totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-control border-line bg-paper text-muted hover:text-ink border p-1 transition-colors focus:outline-hidden disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
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
