'use client';

import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ActionModal } from '@/components/admin/reservations/actions/ActionModal';
import { Button } from '@/components/ui/Button';
import type { AdminRole } from '@/lib/auth/permissions';
import { addDays, formatShort, nightsBetween } from '@/lib/dates';
import type {
  BlockCheckConflict,
  BlockReason,
  CalendarBlockBar,
  CalendarRoom,
} from '@/types/calendar.types';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: AdminRole;
  today: string;
  rooms: CalendarRoom[];
  roomTypes: { id: string; name: string; slug: string }[];
  initialRoomId?: string;
  initialStartDate?: string;
  initialEndDate?: string; // Stored exclusive end date
  blockToEdit?: CalendarBlockBar | null;
}

export function BlockModal({
  isOpen,
  onClose,
  onSuccess,
  role,
  today,
  rooms,
  roomTypes,
  initialRoomId,
  initialStartDate,
  initialEndDate,
  blockToEdit,
}: BlockModalProps) {
  const isManagerOrOwner = role === 'owner' || role === 'manager';
  const isEditing = !!blockToEdit;

  // Selected rooms
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(() => {
    if (blockToEdit) return [blockToEdit.roomId];
    if (initialRoomId) return [initialRoomId];
    return rooms[0] ? [rooms[0].id] : [];
  });

  // Dates
  const [startDate, setStartDate] = useState(
    () => blockToEdit?.startDate || initialStartDate || today,
  );
  // In UI, staff thinks of "Last blocked night".
  // So if startDate is 2026-11-10 and endDate is 2026-11-12, last night is 2026-11-11.
  const [lastNight, setLastNight] = useState(() => {
    if (blockToEdit) return addDays(blockToEdit.endDate, -1);
    if (initialEndDate) return addDays(initialEndDate, -1);
    if (initialStartDate) return initialStartDate;
    return today;
  });

  // Reason & Notes
  const [reason, setReason] = useState<BlockReason>(
    () => blockToEdit?.reason || 'maintenance',
  );
  const [notes, setNotes] = useState(() => blockToEdit?.notes || '');
  const [backdateReason, setBackdateReason] = useState('');

  // Live Conflict checking
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState<BlockCheckConflict[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Exclusive end date for database
  const exclusiveEndDate = addDays(lastNight, 1);
  const nightsCount = nightsBetween(startDate, exclusiveEndDate);
  const isBackdated = startDate < today;

  // Pre-flight conflict check on parameters change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (
        !isOpen ||
        selectedRoomIds.length === 0 ||
        !startDate ||
        !lastNight ||
        lastNight < startDate
      ) {
        if (active) setConflicts([]);
        return;
      }

      setChecking(true);
      try {
        const res = await adminService.checkBlockConflicts({
          roomIds: selectedRoomIds,
          startDate,
          endDate: exclusiveEndDate,
          excludeBlockId: blockToEdit?.id,
        });
        if (active) {
          setConflicts(res.data.conflicts);
        }
      } catch {
        // Handled via submission check
      } finally {
        if (active) setChecking(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    selectedRoomIds,
    startDate,
    lastNight,
    exclusiveEndDate,
    blockToEdit?.id,
  ]);

  // Bulk room selection helpers
  const handleSelectAllOfType = (typeId: string) => {
    const typeRoomIds = rooms
      .filter((r) => r.roomTypeId === typeId)
      .map((r) => r.id);
    setSelectedRoomIds((prev) => {
      const set = new Set([...prev, ...typeRoomIds]);
      return Array.from(set);
    });
  };

  const handleSelectWholeProperty = () => {
    setSelectedRoomIds(rooms.map((r) => r.id));
  };

  const handleToggleRoom = (roomId: string) => {
    if (isEditing) {
      setSelectedRoomIds([roomId]);
      return;
    }
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRoomIds.length === 0) {
      setError('Please select at least one room.');
      return;
    }

    if (lastNight < startDate) {
      setError('Last blocked night cannot be earlier than start date.');
      return;
    }

    if (nightsCount > 365) {
      setError('Block duration cannot exceed 365 nights.');
      return;
    }

    if (isBackdated) {
      if (!isManagerOrOwner) {
        setError('Only managers and owners can create backdated room blocks.');
        return;
      }
      if (!backdateReason.trim()) {
        setError('Please provide a reason for backdating this block.');
        return;
      }
    }

    if (
      (reason === 'owner_hold' || reason === 'renovation') &&
      !isManagerOrOwner
    ) {
      setError(
        `Only managers and owners can select the "${reason}" block reason.`,
      );
      return;
    }

    if (conflicts.length > 0) {
      setError(
        'Cannot save block while there are conflicting reservations or blocks.',
      );
      return;
    }

    setSubmitting(true);

    try {
      if (isEditing && blockToEdit) {
        await adminService.updateBlock(blockToEdit.id, {
          roomId: selectedRoomIds[0],
          startDate,
          endDate: exclusiveEndDate,
          reason,
          notes: notes.trim() || undefined,
          backdateReason: isBackdated ? backdateReason.trim() : undefined,
          version: blockToEdit.updatedAt,
        });
      } else {
        await adminService.createBlocks({
          roomIds: selectedRoomIds,
          startDate,
          endDate: exclusiveEndDate,
          reason,
          notes: notes.trim() || undefined,
          backdateReason: isBackdated ? backdateReason.trim() : undefined,
          idempotencyKey: crypto.randomUUID(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save room block.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!blockToEdit) return;
    setDeleting(true);
    setError(null);

    try {
      await adminService.deleteBlock(blockToEdit.id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete room block.',
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <ActionModal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Room Block' : 'Block Rooms & Dates'}
      description={
        isEditing
          ? 'Modify blocked dates, room, reason or notes.'
          : 'Hold rooms from sale for maintenance, renovation, or hotel operations.'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-control border-danger/30 bg-danger/10 text-small text-danger flex items-start gap-2 border p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete Confirmation Banner */}
        {confirmDelete && (
          <div className="rounded-control border-danger/40 bg-danger/10 space-y-2 border p-3.5">
            <div className="text-small text-danger flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              <span>Are you sure you want to remove this block?</span>
            </div>
            <p className="text-caption text-muted">
              These dates will become available again immediately for new
              bookings. This action is permanently audited.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Removing...' : 'Confirm Remove Block'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Room Selection */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-small text-ink block font-semibold">
              Select Rooms ({selectedRoomIds.length} selected)
            </label>
            {!isEditing && (
              <div className="text-caption flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectWholeProperty}
                  className="text-ink underline hover:opacity-80"
                >
                  Whole Property
                </button>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="text-muted mt-1 flex flex-wrap gap-1 text-[11px]">
              <span>Quick select:</span>
              {roomTypes.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => handleSelectAllOfType(rt.id)}
                  className="bg-canvas rounded-control border-line text-ink hover:bg-paper border px-1.5 py-0.5"
                >
                  All {rt.name}
                </button>
              ))}
            </div>
          )}

          {/* Room Pills */}
          <div className="bg-canvas/30 rounded-control border-line mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border p-2">
            {rooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleToggleRoom(room.id)}
                  className={`rounded-control text-caption border px-2.5 py-1 font-medium transition-colors focus:outline-hidden ${
                    isSelected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-paper text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  #{room.roomNumber} ({room.roomTypeName})
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates Selection */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              First Blocked Night <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Last Blocked Night <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              required
              value={lastNight}
              onChange={(e) => setLastNight(e.target.value)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>
        </div>

        <p className="text-caption text-muted">
          Blocked duration: <strong>{nightsCount} night(s)</strong> (Free again
          on {formatShort(exclusiveEndDate)} for check-in).
        </p>

        {/* Backdate Reason Banner (Manager/Owner only) */}
        {isBackdated && (
          <div className="rounded-control space-y-1.5 border border-amber-300 bg-amber-50/50 p-3 dark:bg-amber-950/20">
            <div className="text-small flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              <span>Backdating Room Block</span>
            </div>
            <p className="text-caption text-muted">
              This block starts in the past. An audit justification is required.
            </p>
            <input
              type="text"
              required
              placeholder="e.g. Emergency leak documented retrospectively..."
              value={backdateReason}
              onChange={(e) => setBackdateReason(e.target.value)}
              className="rounded-control bg-paper text-small text-ink focus:border-ink w-full border border-amber-300 px-3 py-1.5 focus:outline-hidden"
            />
          </div>
        )}

        {/* Reason and Note */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Block Reason <span className="text-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as BlockReason)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            >
              <option value="maintenance">Maintenance</option>
              <option value="other">Other Operations</option>
              <option value="owner_hold" disabled={!isManagerOrOwner}>
                Owner Hold {!isManagerOrOwner && '(Manager/Owner only)'}
              </option>
              <option value="renovation" disabled={!isManagerOrOwner}>
                Renovation {!isManagerOrOwner && '(Manager/Owner only)'}
              </option>
            </select>
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Internal Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. AC servicing, plumbing inspection..."
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Live Conflict Alerts */}
        <div className="pt-1">
          {checking ? (
            <div className="text-caption text-muted flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Verifying calendar availability...</span>
            </div>
          ) : conflicts.length > 0 ? (
            <div className="rounded-control border-danger/40 bg-danger/10 space-y-2 border p-3">
              <div className="text-small text-danger flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  {conflicts.length} Conflict(s) Detected — Cannot Save Block
                </span>
              </div>
              <p className="text-caption text-muted">
                One or more selected rooms already have active reservations or
                overlapping blocks during this range:
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto pt-1">
                {conflicts.map((c) => (
                  <div
                    key={`${c.roomId}-${c.id}`}
                    className="rounded-control border-line bg-paper text-caption flex items-center justify-between border px-2.5 py-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink font-mono font-semibold">
                        #{c.roomNumber}
                      </span>
                      <span>•</span>
                      {c.type === 'reservation' ? (
                        <>
                          <span className="text-ink">{c.guestName}</span>
                          <span className="text-muted font-mono">
                            ({c.reference})
                          </span>
                        </>
                      ) : (
                        <span className="text-danger font-medium uppercase">
                          Existing Block ({c.reason})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted font-mono text-[11px]">
                        {formatShort(c.startDate)} → {formatShort(c.endDate)}
                      </span>
                      {c.type === 'reservation' && (
                        <Link
                          href={`/admin/reservations/${c.id}`}
                          target="_blank"
                          className="text-ink text-[11px] font-medium underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-caption flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>All selected rooms and dates are free of conflicts.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-line flex items-center justify-between border-t pt-3">
          {isEditing && !confirmDelete ? (
            <Button
              type="button"
              variant="danger"
              disabled={submitting}
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="size-4" />
              <span>Remove Block</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || checking || conflicts.length > 0}
            >
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Block'
                  : `Create Block (${selectedRoomIds.length} Rooms)`}
            </Button>
          </div>
        </div>
      </form>
    </ActionModal>
  );
}
