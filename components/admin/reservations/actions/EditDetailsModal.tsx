'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface EditDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function EditDetailsModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: EditDetailsModalProps) {
  const [fullName, setFullName] = useState(reservation.guestName);
  const [email, setEmail] = useState(reservation.guestEmail ?? '');
  const [phone, setPhone] = useState(reservation.guestPhone ?? '');
  const [country, setCountry] = useState(reservation.guestCountry ?? 'NG');
  const [arrivalTime, setArrivalTime] = useState(reservation.arrivalTime ?? '');
  const [specialRequests, setSpecialRequests] = useState(
    reservation.specialRequests ?? '',
  );
  const [internalNotes, setInternalNotes] = useState(reservation.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updated = await adminService.updateDetails(reservation.id, {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        country: country.trim() || undefined,
        arrivalTime: arrivalTime.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Edit guest details and notes"
      description={`Update contact and stay preferences for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-small text-ink block font-semibold">
            Guest Full Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
            <p className="text-caption text-muted mt-1">
              Changing email sends a new confirmation to the new address.
            </p>
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Country Code
            </label>
            <input
              type="text"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="NG"
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 uppercase focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Estimated Arrival Time
            </label>
            <input
              type="text"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              placeholder="e.g. 15:00"
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Special Requests
          </label>
          <textarea
            rows={2}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Guest preferences, dietary requests, early check-in notes..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Internal Staff Notes
          </label>
          <textarea
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Confidential notes visible only to front desk and managers..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Saving...
              </>
            ) : (
              'Save details'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
