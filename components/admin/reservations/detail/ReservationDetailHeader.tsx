'use client';

import {
  Ban,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Edit3,
  Home,
  Mail,
  MoreVertical,
  UserX,
} from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { ReservationDetail } from '@/types/reservation.types';

import { PaymentBadge } from '../PaymentBadge';

interface ReservationDetailHeaderProps {
  reservation: ReservationDetail;
  onAction: (
    action:
      | 'edit'
      | 'change_dates'
      | 'reassign_room'
      | 'record_payment'
      | 'cancel'
      | 'no_show'
      | 'resend',
  ) => void;
}

export function ReservationDetailHeader({
  reservation,
  onAction,
}: ReservationDetailHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(reservation.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedBookedDate = new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(reservation.createdAt));

  const acts = reservation.allowedActions;

  return (
    <div className="border-line flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Reference, Badges and Source */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-h2 text-ink font-semibold tracking-tight">
            {reservation.reference}
          </h1>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={`Copy reference ${reservation.reference}`}
          >
            {copied ? (
              <>
                <Check className="text-success size-3.5" aria-hidden="true" />
                <span className="text-success">{SUCCESS_MESSAGES.COPIED}</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </Button>

          <StatusBadge status={reservation.status} />
          <PaymentBadge state={reservation.paymentState} />
        </div>

        <p className="text-small text-muted-foreground mt-1">
          Booked on {formattedBookedDate} via{' '}
          <span className="text-ink font-semibold capitalize">
            {reservation.bookingSource}
          </span>
          {reservation.channel ? ` (${reservation.channel})` : ''}
        </p>
      </div>

      {/* Action Buttons Area */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Edit Details */}
        <div title={acts.edit_details.reason} className="inline-block">
          <Button
            variant="secondary"
            size="sm"
            disabled={!acts.edit_details.allowed}
            onClick={() => onAction('edit')}
            icon={<Edit3 className="size-3.5" aria-hidden="true" />}
          >
            Edit
          </Button>
        </div>

        {/* Change Dates */}
        <div title={acts.change_dates.reason} className="inline-block">
          <Button
            variant="secondary"
            size="sm"
            disabled={!acts.change_dates.allowed}
            onClick={() => onAction('change_dates')}
            icon={<CalendarDays className="size-3.5" aria-hidden="true" />}
          >
            Change dates
          </Button>
        </div>

        {/* Reassign Room */}
        <div title={acts.reassign_room.reason} className="inline-block">
          <Button
            variant="secondary"
            size="sm"
            disabled={!acts.reassign_room.allowed}
            onClick={() => onAction('reassign_room')}
            icon={<Home className="size-3.5" aria-hidden="true" />}
          >
            Reassign room
          </Button>
        </div>

        {/* Record Payment */}
        <div title={acts.record_payment.reason} className="inline-block">
          <Button
            variant="secondary"
            size="sm"
            disabled={!acts.record_payment.allowed}
            onClick={() => onAction('record_payment')}
            icon={<CreditCard className="size-3.5" aria-hidden="true" />}
          >
            Record payment
          </Button>
        </div>

        {/* Cancel */}
        <div title={acts.cancel.reason} className="inline-block">
          <Button
            variant="danger"
            size="sm"
            disabled={!acts.cancel.allowed}
            onClick={() => onAction('cancel')}
            icon={<Ban className="size-3.5" aria-hidden="true" />}
          >
            Cancel
          </Button>
        </div>

        {/* More Actions Menu */}
        <div className="relative inline-block">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            aria-label="More actions"
            icon={<MoreVertical className="size-3.5" aria-hidden="true" />}
          >
            <span className="sr-only">More</span>
          </Button>

          {showMoreMenu && (
            <div
              className="animate-in fade-in rounded-control border-line bg-paper absolute top-full right-0 z-20 mt-1 w-52 border p-1 shadow-lg"
              onMouseLeave={() => setShowMoreMenu(false)}
            >
              {/* Mark No-Show */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!acts.no_show.allowed}
                title={acts.no_show.reason}
                onClick={() => {
                  setShowMoreMenu(false);
                  onAction('no_show');
                }}
                className="w-full justify-start gap-2"
              >
                <UserX
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                <span>Mark as No-Show</span>
              </Button>

              {/* Resend Confirmation */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!acts.resend_confirmation.allowed}
                title={acts.resend_confirmation.reason}
                onClick={() => {
                  setShowMoreMenu(false);
                  onAction('resend');
                }}
                className="w-full justify-start gap-2"
              >
                <Mail
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                <span>Resend Confirmation</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
