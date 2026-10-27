'use client';

import { Home, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface ReassignRoomModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function ReassignRoomModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ReassignRoomModalProps) {
  const [rooms, setRooms] = useState<
    { id: string; roomNumber: string; floor: number | null }[]
  >([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [note, setNote] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      adminService
        .getAvailableRooms({
          roomTypeId: reservation.roomTypeId,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          excludeReservationId: reservation.id,
        })
        .then((res) => {
          setRooms(res.data.rooms);
          if (res.data.rooms.length > 0) {
            setSelectedRoomId(res.data.rooms[0].id);
          }
          setError(null);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : ERROR_MESSAGES.FAILED_TO_LOAD_AVAILABLE_ROOMS,
          );
        })
        .finally(() => setLoadingRooms(false));
    }
  }, [open, reservation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError(ERROR_MESSAGES.SELECT_AVAILABLE_ROOM);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.reassignRoom(reservation.id, {
        roomId: selectedRoomId,
        note: note.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_REASSIGN_ROOM_UI,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Reassign Room"
      description={`Move stay ${reservation.reference} to another available ${reservation.roomTypeName} room.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-1.5">
          <Label className="text-small text-ink font-semibold">
            Available Rooms ({reservation.roomTypeName})
          </Label>

          {loadingRooms ? (
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
                    onClick={() => setSelectedRoomId(r.id)}
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
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reassign-note">Reason / Reassignment Note</Label>
          <Textarea
            id="reassign-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Guest requested quiet room away from elevator..."
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
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
            disabled={submitting || rooms.length === 0 || !selectedRoomId}
            loading={submitting}
          >
            Confirm reassignment
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
