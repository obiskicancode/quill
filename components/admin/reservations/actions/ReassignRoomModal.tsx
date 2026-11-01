'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Home, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useAvailableReservationRooms,
  useReassignReservationRoom,
} from '@/hooks/services/admin/use-reservations';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { reassignRoomSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const reassignFormSchema = reassignRoomSchema
  .omit({ version: true, idempotencyKey: true })
  .extend({
    roomId: z.string().uuid(ERROR_MESSAGES.SELECT_AVAILABLE_ROOM),
  });

type ReassignFormInput = z.input<typeof reassignFormSchema>;
type ReassignFormOutput = z.output<typeof reassignFormSchema>;

interface ReassignRoomModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function ReassignRoomModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ReassignRoomModalProps) {
  const roomsQuery = useAvailableReservationRooms(
    {
      roomTypeId: reservation.roomTypeId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      excludeReservationId: reservation.id,
    },
    open,
  );
  const reassignRoom = useReassignReservationRoom();
  const form = useForm<ReassignFormInput, unknown, ReassignFormOutput>({
    resolver: zodResolver(reassignFormSchema),
    defaultValues: {
      roomId: '',
      note: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
    setValue,
  } = form;
  const selectedRoomId = useWatch({ control, name: 'roomId' });
  const busy = isSubmitting || reassignRoom.isPending;
  const [error, setError] = useState<string | null>(null);
  const rooms = roomsQuery.data?.rooms ?? [];
  const roomsError = roomsQuery.error
    ? roomsQuery.error instanceof Error
      ? roomsQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_AVAILABLE_ROOMS
    : null;

  useEffect(() => {
    if (!roomsQuery.data) return;

    const available = roomsQuery.data.rooms;
    const current = form.getValues('roomId');

    if (available.length === 0) {
      setValue('roomId', '');
    } else if (!available.some((room) => room.id === current)) {
      setValue('roomId', available[0].id);
    }
  }, [form, roomsQuery.data, setValue]);

  const onSubmit = async (input: ReassignFormOutput) => {
    setError(null);

    try {
      const updated = await reassignRoom.mutateAsync({
        id: reservation.id,
        body: {
          roomId: input.roomId,
          note: input.note?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.ROOM_REASSIGNED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_REASSIGN_ROOM_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Reassign Room"
      description={`Move stay ${reservation.reference} to another available ${reservation.roomTypeName} room.`}
      error={error ?? roomsError}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label className="text-small text-ink font-semibold">
            Current Room
          </Label>
          <div className="bg-muted rounded-control border-line text-small text-ink flex items-center gap-2 border p-3">
            <Home className="text-muted-foreground size-4" aria-hidden="true" />
            <span>
              Room <strong>{reservation.roomNumber}</strong> (
              {reservation.roomTypeName})
            </span>
          </div>
        </div>

        <Field
          id="reassign-room"
          label={`Available Rooms (${reservation.roomTypeName})`}
          error={errors.roomId?.message}
        >
          {() =>
            roomsQuery.isPending ? (
              <div className="text-small text-muted-foreground flex items-center justify-center p-6">
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Checking availability...
              </div>
            ) : rooms.length === 0 ? (
              <div className="rounded-control border-primary/40 bg-primary/10 text-small text-ink mt-1 border p-3">
                No other rooms of this type are currently available for the full
                stay dates ({reservation.checkIn} to {reservation.checkOut}).
              </div>
            ) : (
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {rooms.map((r) => {
                  const selected = selectedRoomId === r.id;
                  return (
                    <Button
                      key={r.id}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="md"
                      onClick={() => setValue('roomId', r.id)}
                      disabled={busy}
                      className="h-auto flex-col py-3"
                    >
                      <span className="font-mono text-base font-bold">
                        {r.roomNumber}
                      </span>
                      <span className="text-caption opacity-80">
                        {r.floor !== null ? `Floor ${r.floor}` : 'Main Floor'}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )
          }
        </Field>

        <Field
          id="reassign-note"
          label="Reason / Reassignment Note"
          error={errors.note?.message}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register('note')}
              rows={2}
              disabled={busy}
              placeholder="e.g. Guest requested quiet room away from elevator..."
              className={inputClass(errors.note?.message)}
            />
          )}
        </Field>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
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
            disabled={busy || rooms.length === 0 || !selectedRoomId}
            loading={busy}
          >
            Confirm reassignment
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
