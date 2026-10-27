'use client';

import { format, parseISO } from 'date-fns';
import { AlertCircle, CalendarDays, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface ChangeDatesModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function ChangeDatesModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ChangeDatesModalProps) {
  const [checkIn, setCheckIn] = useState(reservation.checkIn);
  const [checkOut, setCheckOut] = useState(reservation.checkOut);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    reservation.roomId,
  );
  const [overrideRules, setOverrideRules] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [quoteData, setQuoteData] = useState<{
    currentRoomAvailable: boolean;
    candidateRooms: { id: string; roomNumber: string; floor: number | null }[];
    comparison: {
      currentTotalMinor: number;
      newTotalMinor: number;
      diffMinor: number;
      guestOwesMinor: number;
      refundDueMinor: number;
      noDifference: boolean;
    };
  } | null>(null);

  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchQuote = async () => {
    if (checkOut <= checkIn) {
      setError(ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN_UI);
      return;
    }

    setError(null);
    setQuoting(true);

    try {
      const res = await adminService.quoteChangeDates(reservation.id, {
        checkIn,
        checkOut,
      });

      setQuoteData(res.data);
      if (
        !res.data.currentRoomAvailable &&
        res.data.candidateRooms.length > 0
      ) {
        setSelectedRoomId(res.data.candidateRooms[0].id);
      } else {
        setSelectedRoomId(reservation.roomId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_QUOTE_DATES,
      );
    } finally {
      setQuoting(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!quoteData) {
      setError(ERROR_MESSAGES.CHECK_PRICE_AVAILABILITY_FIRST);
      return;
    }

    if (
      overrideRules &&
      (!overrideReason || overrideReason.trim().length < 3)
    ) {
      setError(ERROR_MESSAGES.OVERRIDE_REASON_REQUIRED);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.changeDates(reservation.id, {
        checkIn,
        checkOut,
        roomId: selectedRoomId,
        overrideRules,
        overrideReason: overrideReason.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data, SUCCESS_MESSAGES.RESERVATION_DATES_CHANGED);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_CHANGE_DATES_UI,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Change Stay Dates"
      description={`Modify arrival and departure dates for ${reservation.reference}.`}
      error={error}
      maxWidth="xl"
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Inputs */}
        <div className="space-y-1.5">
          <Label className="text-small text-ink font-semibold">
            New Stay Dates <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-start gap-2.5 text-left font-normal"
                />
              }
            >
              <CalendarDays className="text-muted-foreground size-4 shrink-0" />
              <span>
                {checkIn && checkOut
                  ? `${format(parseISO(checkIn), 'LLL dd, y')} - ${format(parseISO(checkOut), 'LLL dd, y')}`
                  : checkIn
                    ? `From ${format(parseISO(checkIn), 'LLL dd, y')}`
                    : 'Select new stay dates'}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={{
                  from: checkIn ? parseISO(checkIn) : undefined,
                  to: checkOut ? parseISO(checkOut) : undefined,
                }}
                onSelect={(range) => {
                  if (range?.from) setCheckIn(format(range.from, 'yyyy-MM-dd'));
                  if (range?.to) setCheckOut(format(range.to, 'yyyy-MM-dd'));
                  setQuoteData(null);
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleFetchQuote}
            disabled={quoting || checkOut <= checkIn}
          >
            {quoting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Checking availability & prices...
              </>
            ) : (
              'Check availability & calculate price'
            )}
          </Button>
        </div>

        {/* Quote Comparison Results */}
        {quoteData && (
          <div className="bg-muted rounded-control border-line text-small space-y-3 border p-4">
            <h3 className="text-ink font-semibold">Stay Comparison</h3>

            {/* Price Difference Indicator */}
            <div className="border-line flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Previous Total:</span>
              <span className="text-ink font-medium">
                {formatNaira(quoteData.comparison.currentTotalMinor / 100)}
              </span>
            </div>
            <div className="border-line flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">New Total:</span>
              <span className="text-ink font-bold">
                {formatNaira(quoteData.comparison.newTotalMinor / 100)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-ink font-semibold">Outcome:</span>
              <span
                className={`font-bold ${
                  quoteData.comparison.guestOwesMinor > 0
                    ? 'text-brand-ink'
                    : quoteData.comparison.refundDueMinor > 0
                      ? 'text-success'
                      : 'text-muted-foreground'
                }`}
              >
                {quoteData.comparison.guestOwesMinor > 0
                  ? `Guest owes ${formatNaira(quoteData.comparison.guestOwesMinor / 100)}`
                  : quoteData.comparison.refundDueMinor > 0
                    ? `Refund due: ${formatNaira(quoteData.comparison.refundDueMinor / 100)}`
                    : 'No price difference'}
              </span>
            </div>

            {/* Room Availability Status */}
            <div className="border-line border-t pt-2">
              {!quoteData.currentRoomAvailable ? (
                <div className="space-y-2">
                  <div className="text-caption text-destructive flex items-start gap-2">
                    <AlertCircle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Room {reservation.roomNumber} is unavailable for these new
                      dates. Select an available room of the same type:
                    </span>
                  </div>

                  {quoteData.candidateRooms.length === 0 ? (
                    <p className="text-caption text-destructive font-semibold">
                      No rooms of this type are available for the new dates.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {quoteData.candidateRooms.map((r) => (
                        <Button
                          key={r.id}
                          type="button"
                          variant={
                            selectedRoomId === r.id ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() => setSelectedRoomId(r.id)}
                        >
                          Room {r.roomNumber}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-caption text-success flex items-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  <span>
                    Current room {reservation.roomNumber} is available for the
                    new dates.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager Override Controls */}
        <div className="border-line space-y-2 border-t pt-3">
          <Label
            htmlFor="override-rules-toggle"
            className="text-small text-ink flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              id="override-rules-toggle"
              checked={overrideRules}
              onCheckedChange={(checked) => setOverrideRules(!!checked)}
            />
            <span>Override hotel policies (min notice, same-day cut-off)</span>
          </Label>

          {overrideRules && (
            <div className="space-y-1.5 pt-2">
              <Label
                htmlFor="override-reason-input"
                className="text-small text-ink font-semibold"
              >
                Override Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="override-reason-input"
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. VIP guest request approved by General Manager..."
              />
            </div>
          )}
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
            disabled={submitting || !quoteData}
            loading={submitting}
          >
            Confirm date change
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}
