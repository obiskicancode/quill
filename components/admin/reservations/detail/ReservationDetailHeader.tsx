'use client';

import {
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Edit3,
  Home,
  Mail,
  UserX,
} from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';

import {
  AdminStatusBadge,
  paymentStateTone,
  reservationTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatHotelDateTime } from '@/lib/format';
import type { ActionGate } from '@/types/base.types';
import type { ReservationDetail } from '@/types/reservation.types';

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

type ActionKey =
  | 'edit'
  | 'change_dates'
  | 'reassign_room'
  | 'record_payment'
  | 'cancel'
  | 'no_show'
  | 'resend';

type ActionGroup = 'Stay' | 'Payments' | 'Guest' | 'Danger';

interface ActionDescriptor {
  group: ActionGroup;
  gate: ActionGate;
  icon: ReactNode;
  key: ActionKey;
  label: string;
}

const GROUP_ORDER: ActionGroup[] = ['Stay', 'Payments', 'Guest', 'Danger'];

/**
 * Only one action leads. The rest sit behind the menu so the operator reads one
 * next step instead of six equally weighted buttons.
 */
const PRIMARY_PRIORITY: ActionKey[] = [
  'record_payment',
  'change_dates',
  'reassign_room',
  'edit',
];

/** Reservation header with status, reference, stay summary and action menu. */
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

  const actions: ActionDescriptor[] = [
    {
      key: 'change_dates',
      group: 'Stay',
      label: 'Change dates',
      gate: acts.change_dates,
      icon: <CalendarDays aria-hidden="true" />,
    },
    {
      key: 'reassign_room',
      group: 'Stay',
      label: 'Reassign room',
      gate: acts.reassign_room,
      icon: <Home aria-hidden="true" />,
    },
    {
      key: 'edit',
      group: 'Stay',
      label: 'Edit details',
      gate: acts.edit_details,
      icon: <Edit3 aria-hidden="true" />,
    },
    {
      key: 'record_payment',
      group: 'Payments',
      label: 'Record payment',
      gate: acts.record_payment,
      icon: <CreditCard aria-hidden="true" />,
    },
    {
      key: 'no_show',
      group: 'Guest',
      label: 'Mark as no-show',
      gate: acts.no_show,
      icon: <UserX aria-hidden="true" />,
    },
    {
      key: 'resend',
      group: 'Guest',
      label: 'Resend confirmation',
      gate: acts.resend_confirmation,
      icon: <Mail aria-hidden="true" />,
    },
    {
      key: 'cancel',
      group: 'Danger',
      label: 'Cancel reservation',
      gate: acts.cancel,
      icon: <Ban aria-hidden="true" />,
    },
  ];

  const primary =
    PRIMARY_PRIORITY.map((key) => actions.find((a) => a.key === key)).find(
      (action) => action?.gate.allowed,
    ) ?? null;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: actions.filter(
      (action) => action.group === group && action.key !== primary?.key,
    ),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

          <AdminStatusBadge tone={reservationTone(reservation.status)}>
            {statusLabel(reservation.status)}
          </AdminStatusBadge>
          <AdminStatusBadge tone={paymentStateTone(reservation.paymentState)}>
            {statusLabel(reservation.paymentState)}
          </AdminStatusBadge>
        </div>

        <p className="mt-1 text-small text-muted-foreground">
          Booked on {formattedBookedDate} via{' '}
          <span className="font-semibold text-ink capitalize">
            {reservation.bookingSource}
          </span>
          {reservation.channel ? ` (${reservation.channel})` : ''}
        </p>
      </div>

      {/* Contextual primary plus everything else behind one labelled menu */}
      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <Button
            type="button"
            size="sm"
            onClick={() => onAction(primary.key)}
            icon={primary.icon}
          >
            {primary.label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="secondary" size="sm">
                All actions
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </Button>
            }
          />

          <DropdownMenuContent className="w-72">
            {groups.map(({ group, items }, index) => (
              <Fragment key={group}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  {items.map((action) => (
                    <DropdownMenuItem
                      key={action.key}
                      variant={group === 'Danger' ? 'destructive' : undefined}
                      disabled={!action.gate.allowed}
                      onClick={() => onAction(action.key)}
                    >
                      {action.icon}
                      <span className="flex min-w-0 flex-col">
                        <span>{action.label}</span>
                        {!action.gate.allowed && action.gate.reason && (
                          <span className="text-caption font-normal text-muted-foreground">
                            {action.gate.reason}
                          </span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
