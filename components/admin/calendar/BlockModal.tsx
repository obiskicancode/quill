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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { addDays, formatShort, nightsBetween } from '@/lib/dates';
import type { AdminRole } from '@/types/auth.types';
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
      setError(ERROR_MESSAGES.SELECT_AT_LEAST_ONE_ROOM_PLEASE);
      return;
    }

    if (lastNight < startDate) {
      setError(ERROR_MESSAGES.BLOCK_LAST_NIGHT_BEFORE_START);
      return;
    }

    if (nightsCount > 365) {
      setError(ERROR_MESSAGES.BLOCK_DURATION_TOO_LONG);
      return;
    }

    if (isBackdated) {
      if (!isManagerOrOwner) {
        setError(ERROR_MESSAGES.MANAGERS_ONLY_BACKDATED_BLOCKS);
        return;
      }
      if (!backdateReason.trim()) {
        setError(ERROR_MESSAGES.BACKDATE_REASON_PROMPT);
        return;
      }
    }

    if (
      (reason === 'owner_hold' || reason === 'renovation') &&
      !isManagerOrOwner
    ) {
      setError(ERROR_MESSAGES.MANAGERS_ONLY_BLOCK_REASON(reason));
      return;
    }

    if (conflicts.length > 0) {
      setError(ERROR_MESSAGES.BLOCK_CONFLICT_CANNOT_SAVE);
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
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_ROOM_BLOCK;
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
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_DELETE_BLOCK,
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
          <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2 border p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete Confirmation Banner */}
        {confirmDelete && (
          <div className="rounded-control border-destructive/40 bg-destructive/10 space-y-2 border p-3.5">
            <div className="text-small text-destructive flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              <span>Are you sure you want to remove this block?</span>
            </div>
            <p className="text-caption text-muted-foreground">
              These dates will become available again immediately for new
              bookings. This action is permanently audited.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
              >
                Confirm Remove Block
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
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
            <Label className="text-small text-ink block font-semibold">
              Select Rooms ({selectedRoomIds.length} selected)
            </Label>
            {!isEditing && (
              <div className="text-caption flex items-center gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleSelectWholeProperty}
                  className="text-ink h-auto p-0 underline hover:opacity-80"
                >
                  Whole Property
                </Button>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-[0.6875rem]">
              <span>Quick select:</span>
              {roomTypes.map((rt) => (
                <Button
                  key={rt.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllOfType(rt.id)}
                  className="h-6 px-1.5 py-0.5 text-[0.6875rem]"
                >
                  All {rt.name}
                </Button>
              ))}
            </div>
          )}

          {/* Room Pills */}
          <div className="bg-muted/30 rounded-control border-line mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border p-2">
            {rooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <Button
                  key={room.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleRoom(room.id)}
                  className="h-auto rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  #{room.roomNumber} ({room.roomTypeName})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Dates Selection */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="block-start-date"
              className="text-small text-ink font-semibold"
            >
              First Blocked Night <span className="text-destructive">*</span>
            </Label>
            <Input
              id="block-start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-paper"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="block-last-night"
              className="text-small text-ink font-semibold"
            >
              Last Blocked Night <span className="text-destructive">*</span>
            </Label>
            <Input
              id="block-last-night"
              type="date"
              required
              value={lastNight}
              onChange={(e) => setLastNight(e.target.value)}
              className="bg-paper"
            />
          </div>
        </div>

        <p className="text-caption text-muted-foreground">
          Blocked duration: <strong>{nightsCount} night(s)</strong> (Free again
          on {formatShort(exclusiveEndDate)} for check-in).
        </p>

        {/* Backdate Reason Banner (Manager/Owner only) */}
        {isBackdated && (
          <div className="rounded-control border-primary/30 bg-primary/10 space-y-1.5 border p-3">
            <div className="text-small text-brand-ink flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4" />
              <span>Backdating Room Block</span>
            </div>
            <p className="text-caption text-muted-foreground">
              This block starts in the past. An audit justification is required.
            </p>
            <Label htmlFor="block-backdate-reason" className="sr-only">
              Audit justification for backdating
            </Label>
            <Input
              id="block-backdate-reason"
              type="text"
              required
              placeholder="e.g. Emergency leak documented retrospectively..."
              value={backdateReason}
              onChange={(e) => setBackdateReason(e.target.value)}
              className="bg-paper border-primary/40"
            />
          </div>
        )}

        {/* Reason and Note */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="block-reason"
              className="text-small text-ink font-semibold"
            >
              Block Reason <span className="text-destructive">*</span>
            </Label>
            <Select
              items={{
                maintenance: 'Maintenance',
                other: 'Other Operations',
                owner_hold: isManagerOrOwner
                  ? 'Owner Hold'
                  : 'Owner Hold (Manager/Owner only)',
                renovation: isManagerOrOwner
                  ? 'Renovation'
                  : 'Renovation (Manager/Owner only)',
              }}
              value={reason}
              onValueChange={(val) => {
                if (val) setReason(val as BlockReason);
              }}
            >
              <SelectTrigger id="block-reason" className="w-full">
                <SelectValue placeholder="Select block reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other Operations</SelectItem>
                <SelectItem value="owner_hold" disabled={!isManagerOrOwner}>
                  Owner Hold {!isManagerOrOwner && '(Manager/Owner only)'}
                </SelectItem>
                <SelectItem value="renovation" disabled={!isManagerOrOwner}>
                  Renovation {!isManagerOrOwner && '(Manager/Owner only)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="block-notes"
              className="text-small text-ink font-semibold"
            >
              Internal Notes
            </Label>
            <Input
              id="block-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. AC servicing, plumbing inspection..."
              className="bg-paper"
            />
          </div>
        </div>

        {/* Live Conflict Alerts */}
        <div className="pt-1">
          {checking ? (
            <div className="text-caption text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Verifying calendar availability...</span>
            </div>
          ) : conflicts.length > 0 ? (
            <div className="rounded-control border-destructive/40 bg-destructive/10 space-y-2 border p-3">
              <div className="text-small text-destructive flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  {conflicts.length} Conflict(s) Detected — Cannot Save Block
                </span>
              </div>
              <p className="text-caption text-muted-foreground">
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
                          <span className="text-muted-foreground font-mono">
                            ({c.reference})
                          </span>
                        </>
                      ) : (
                        <span className="text-destructive font-medium uppercase">
                          Existing Block ({c.reason})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-[0.6875rem]">
                        {formatShort(c.startDate)} → {formatShort(c.endDate)}
                      </span>
                      {c.type === 'reservation' && (
                        <Link
                          href={`/admin/reservations/${c.id}`}
                          target="_blank"
                          className="text-ink text-[0.6875rem] font-medium underline"
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
            <div className="text-caption text-success flex items-center gap-1.5">
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
              variant="destructive"
              size="sm"
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
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={submitting || checking || conflicts.length > 0}
            >
              {isEditing
                ? 'Update Block'
                : `Create Block (${selectedRoomIds.length} Rooms)`}
            </Button>
          </div>
        </div>
      </form>
    </ActionModal>
  );
}
