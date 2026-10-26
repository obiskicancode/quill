'use client';

import { Home, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
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
              : 'Failed to load available rooms',
          );
        })
        .finally(() => setLoadingRooms(false));
    }
  }, [open, reservation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError('Please select an available room.');
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
      setError(err instanceof Error ? err.message : 'Failed to reassign room');
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
        <div>
          <label className="text-small text-ink block font-semibold">
            Current Room
          </label>
          <div className="bg-canvas rounded-control border-line text-small text-ink mt-1 flex items-center gap-2 border p-3">
            <Home className="text-muted size-4" aria-hidden="true" />
            <span>
              Room <strong>{reservation.roomNumber}</strong> (
              {reservation.roomTypeName})
            </span>
          </div>
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Available Rooms ({reservation.roomTypeName})
          </label>

          {loadingRooms ? (
            <div className="text-small text-muted flex items-center justify-center p-6">
              <Loader2
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
              Checking availability...
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-control border-accent/40 bg-accent/10 text-small text-ink mt-1 border p-3">
              No other rooms of this type are currently available for the full
              stay dates ({reservation.checkIn} to {reservation.checkOut}).
            </div>
          ) : (
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rooms.map((r) => {
                const selected = selectedRoomId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`rounded-control flex flex-col items-center justify-center border p-3 text-center transition-colors ${
                      selected
                        ? 'border-accent bg-accent/15 text-accent-ink ring-accent font-semibold ring-2'
                        : 'border-line bg-paper text-ink hover:border-ink'
                    }`}
                  >
                    <span className="font-mono text-base font-bold">
                      {r.roomNumber}
                    </span>
                    <span className="text-caption text-muted">
                      {r.floor !== null ? `Floor ${r.floor}` : 'Main Floor'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Reason / Reassignment Note
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Guest requested quiet room away from elevator..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
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
            disabled={submitting || rooms.length === 0 || !selectedRoomId}
          >
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Reassigning...
              </>
            ) : (
              'Confirm reassignment'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
