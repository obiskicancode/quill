'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ActionModal } from '@/components/admin/reservations/actions/ActionModal';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { BLOCK_REASONS } from '@/constants/calendar';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useBlockConflicts,
  useCreateBlocks,
  useDeleteBlock,
  useUpdateBlock,
} from '@/hooks/services/admin/use-calendar';
import { addDays, formatShort, nightsBetween } from '@/lib/dates';
import type { AdminRole } from '@/types/auth.types';
import type {
  AdminBlockCheckInput,
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

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const blockFormBase = z.object({
  roomIds: z
    .array(z.string().uuid())
    .min(1, ERROR_MESSAGES.SELECT_AT_LEAST_ONE_ROOM_PLEASE),
  startDate: z
    .string()
    .regex(dateRegex, ERROR_MESSAGES.INVALID_START_DATE_FORMAT),
  lastNight: z
    .string()
    .regex(dateRegex, ERROR_MESSAGES.INVALID_END_DATE_FORMAT),
  reason: z.enum(BLOCK_REASONS),
  notes: z.string().max(1000, ERROR_MESSAGES.NOTES_TOO_LONG),
  backdateReason: z.string(),
});

type BlockFormInput = z.input<typeof blockFormBase>;
type BlockFormOutput = z.output<typeof blockFormBase>;

function createBlockFormSchema(today: string, isManagerOrOwner: boolean) {
  return blockFormBase.superRefine((data, ctx) => {
    const exclusiveEndDate = addDays(data.lastNight, 1);
    const nightsCount = nightsBetween(data.startDate, exclusiveEndDate);
    const isBackdated = data.startDate < today;

    if (data.lastNight < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastNight'],
        message: ERROR_MESSAGES.BLOCK_LAST_NIGHT_BEFORE_START,
      });
      return;
    }

    if (nightsCount > 365) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastNight'],
        message: ERROR_MESSAGES.BLOCK_DURATION_TOO_LONG,
      });
      return;
    }

    if (isBackdated) {
      if (!isManagerOrOwner) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: ERROR_MESSAGES.MANAGERS_ONLY_BACKDATED_BLOCKS,
        });
        return;
      }
      if (!data.backdateReason.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['backdateReason'],
          message: ERROR_MESSAGES.BACKDATE_REASON_PROMPT,
        });
        return;
      }
    }

    if (
      (data.reason === 'owner_hold' || data.reason === 'renovation') &&
      !isManagerOrOwner
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: ERROR_MESSAGES.MANAGERS_ONLY_BLOCK_REASON(data.reason),
      });
    }
  });
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

  const createBlocks = useCreateBlocks();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();

  const formSchema = useMemo(
    () => createBlockFormSchema(today, isManagerOrOwner),
    [today, isManagerOrOwner],
  );

  const form = useForm<BlockFormInput, unknown, BlockFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomIds: blockToEdit
        ? [blockToEdit.roomId]
        : initialRoomId
          ? [initialRoomId]
          : rooms[0]
            ? [rooms[0].id]
            : [],
      startDate: blockToEdit?.startDate || initialStartDate || today,
      lastNight: blockToEdit
        ? addDays(blockToEdit.endDate, -1)
        : initialEndDate
          ? addDays(initialEndDate, -1)
          : initialStartDate || today,
      reason: blockToEdit?.reason || 'maintenance',
      notes: blockToEdit?.notes || '',
      backdateReason: '',
    },
    mode: 'onBlur',
  });

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch,
  } = form;

  const values = watch();
  const selectedRoomIds = values.roomIds;
  const startDate = values.startDate;
  const lastNight = values.lastNight;
  const exclusiveEndDate = addDays(lastNight || startDate || today, 1);
  const nightsCount =
    startDate && lastNight ? nightsBetween(startDate, exclusiveEndDate) : 0;
  const isBackdated = Boolean(startDate) && startDate < today;
  const roomIdsKey = selectedRoomIds.join('|');

  const [conflictInput, setConflictInput] =
    useState<AdminBlockCheckInput | null>(null);
  const conflictQuery = useBlockConflicts(conflictInput, isOpen);
  const conflicts = conflictQuery.data?.conflicts ?? [];
  const checking = conflictQuery.isFetching;

  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (
        selectedRoomIds.length === 0 ||
        !startDate ||
        !lastNight ||
        lastNight < startDate
      ) {
        setConflictInput(null);
        return;
      }
      setConflictInput({
        roomIds: selectedRoomIds,
        startDate,
        endDate: addDays(lastNight, 1),
        excludeBlockId: blockToEdit?.id,
      });
    }, 250);

    return () => clearTimeout(timer);
    // selectedRoomIds is represented by roomIdsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomIdsKey, startDate, lastNight, blockToEdit?.id]);

  // Bulk room selection helpers
  const handleSelectAllOfType = (typeId: string) => {
    const typeRoomIds = rooms
      .filter((r) => r.roomTypeId === typeId)
      .map((r) => r.id);
    const set = new Set([...selectedRoomIds, ...typeRoomIds]);
    setValue('roomIds', Array.from(set), { shouldValidate: true });
  };

  const handleSelectWholeProperty = () => {
    setValue(
      'roomIds',
      rooms.map((r) => r.id),
      { shouldValidate: true },
    );
  };

  const handleToggleRoom = (roomId: string) => {
    if (isEditing) {
      setValue('roomIds', [roomId], { shouldValidate: true });
      return;
    }
    setValue(
      'roomIds',
      selectedRoomIds.includes(roomId)
        ? selectedRoomIds.filter((id) => id !== roomId)
        : [...selectedRoomIds, roomId],
      { shouldValidate: true },
    );
  };

  const submitting = isSubmitting || createBlocks.isPending;
  const updating = updateBlock.isPending;
  const busy = submitting || updating;
  const deleting = deleteBlock.isPending;

  // Submit Handler
  const onSubmit = async (input: BlockFormOutput) => {
    setFormError(null);

    if (conflicts.length > 0) {
      setFormError(ERROR_MESSAGES.BLOCK_CONFLICT_CANNOT_SAVE);
      return;
    }

    const endDate = addDays(input.lastNight, 1);
    const notes = input.notes.trim() || undefined;
    const backdateReason =
      input.startDate < today ? input.backdateReason.trim() : undefined;

    try {
      if (isEditing && blockToEdit) {
        await updateBlock.mutateAsync({
          id: blockToEdit.id,
          body: {
            roomId: input.roomIds[0],
            startDate: input.startDate,
            endDate,
            reason: input.reason,
            notes,
            backdateReason,
            version: blockToEdit.updatedAt,
          },
        });
      } else {
        await createBlocks.mutateAsync({
          roomIds: input.roomIds,
          startDate: input.startDate,
          endDate,
          reason: input.reason,
          notes,
          backdateReason,
          idempotencyKey: crypto.randomUUID(),
        });
      }

      toast.add({
        title: isEditing
          ? SUCCESS_MESSAGES.ROOM_BLOCK_UPDATED
          : SUCCESS_MESSAGES.ROOM_BLOCK_CREATED,
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_ROOM_BLOCK,
      );
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!blockToEdit) return;
    setFormError(null);

    try {
      await deleteBlock.mutateAsync(blockToEdit.id);
      toast.add({
        title: SUCCESS_MESSAGES.ROOM_BLOCK_REMOVED,
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_DELETE_BLOCK,
      );
    } finally {
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2 border p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{formError}</span>
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
          {errors.roomIds?.message && (
            <p className="text-small text-destructive mt-1.5 font-medium">
              {errors.roomIds.message}
            </p>
          )}
        </div>

        {/* Dates Selection */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            id="block-start-date"
            label="First Blocked Night *"
            error={errors.startDate?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="date"
                className={inputClass(errors.startDate?.message)}
                {...register('startDate')}
              />
            )}
          </Field>

          <Field
            id="block-last-night"
            label="Last Blocked Night *"
            error={errors.lastNight?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="date"
                className={inputClass(errors.lastNight?.message)}
                {...register('lastNight')}
              />
            )}
          </Field>
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
              placeholder="e.g. Emergency leak documented retrospectively..."
              aria-invalid={errors.backdateReason ? true : undefined}
              aria-describedby={
                errors.backdateReason
                  ? 'block-backdate-reason-error'
                  : undefined
              }
              className={inputClass(errors.backdateReason?.message)}
              {...register('backdateReason')}
            />
            {errors.backdateReason?.message && (
              <p
                id="block-backdate-reason-error"
                className="text-small text-destructive font-medium"
              >
                {errors.backdateReason.message}
              </p>
            )}
          </div>
        )}

        {/* Reason and Note */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            id="block-reason"
            label="Block Reason *"
            error={errors.reason?.message}
          >
            {(a11y) => (
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
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
                    value={field.value}
                    onValueChange={(val) => {
                      if (val) field.onChange(val);
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger
                      {...a11y}
                      onBlur={field.onBlur}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select block reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other Operations</SelectItem>
                      <SelectItem
                        value="owner_hold"
                        disabled={!isManagerOrOwner}
                      >
                        Owner Hold {!isManagerOrOwner && '(Manager/Owner only)'}
                      </SelectItem>
                      <SelectItem
                        value="renovation"
                        disabled={!isManagerOrOwner}
                      >
                        Renovation {!isManagerOrOwner && '(Manager/Owner only)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>

          <Field
            id="block-notes"
            label="Internal Notes"
            error={errors.notes?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. AC servicing, plumbing inspection..."
                className={inputClass(errors.notes?.message)}
                {...register('notes')}
              />
            )}
          </Field>
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
              disabled={busy}
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
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={busy}
              disabled={busy || checking || conflicts.length > 0}
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
