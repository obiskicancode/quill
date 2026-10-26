'use client';

import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
        <div className="space-y-1.5">
          <Label htmlFor="edit-guest-name">
            Guest Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-guest-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-guest-email">Email Address</Label>
            <Input
              id="edit-guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
            />
            <p className="text-caption text-muted-foreground">
              Changing email sends a new confirmation to the new address.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-guest-phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-guest-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-guest-country">Country Code</Label>
            <Input
              id="edit-guest-country"
              type="text"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="NG"
              className="uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-arrival-time">Estimated Arrival Time</Label>
            <Input
              id="edit-arrival-time"
              type="text"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              placeholder="e.g. 15:00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-special-requests">Special Requests</Label>
          <Textarea
            id="edit-special-requests"
            rows={2}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Guest preferences, dietary requests, early check-in notes..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-internal-notes">Internal Staff Notes</Label>
          <Textarea
            id="edit-internal-notes"
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Confidential notes visible only to front desk and managers..."
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            Save details
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
