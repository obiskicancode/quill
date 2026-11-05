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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatHotelDateTime } from '@/lib/format';
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

  const handleCopy = () => {
    navigator.clipboard.writeText(reservation.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedBookedDate = formatHotelDateTime(reservation.createdAt);

  const acts = reservation.allowedActions;

  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Reference, Badges and Source */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-h2 font-semibold tracking-tight text-ink">
            {reservation.reference}
          </h1>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            aria-label={`Copy reference ${reservation.reference}`}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-success" aria-hidden="true" />
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

        <p className="mt-1 text-small text-muted-foreground">
          Booked on {formattedBookedDate} via{' '}
          <span className="font-semibold text-ink capitalize">
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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="secondary"
                size="sm"
                aria-label="More actions"
                icon={<MoreVertical className="size-3.5" aria-hidden="true" />}
              >
                <span className="sr-only">More</span>
              </Button>
            }
          />

          <DropdownMenuContent className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={!acts.no_show.allowed}
                title={acts.no_show.reason}
                onClick={() => onAction('no_show')}
              >
                <UserX className="text-muted-foreground" aria-hidden="true" />
                Mark as No-Show
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={!acts.resend_confirmation.allowed}
                title={acts.resend_confirmation.reason}
                onClick={() => onAction('resend')}
              >
                <Mail className="text-muted-foreground" aria-hidden="true" />
                Resend Confirmation
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
