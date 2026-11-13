import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  MailWarning,
  Wrench,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ReservationAlertFlags } from '@/types/reservation.types';

interface ReservationAlertsProps {
  alerts: ReservationAlertFlags;
  cancellationReason?: string | null;
  status: string;
  onApprove?: () => void;
  onDecline?: () => void;
  onVerifyTransfer?: () => void;
}

/**
 * `destructive` stays reserved for a failure the operator has to resolve — a
 * room conflict or a booking that cannot stand. Deadlines read as `warning`,
 * work in front of them as `brand`, and terminal states as `neutral`.
 */
type AlertVariant = 'brand' | 'destructive' | 'neutral' | 'warning';

interface AlertItem {
  action?: ReactNode;
  body?: ReactNode;
  icon: ReactNode;
  id: string;
  priority: number;
  summary: ReactNode;
  title: ReactNode;
  variant: AlertVariant;
}

/** The work that has to happen beats the note that merely explains the state. */
const MAX_VISIBLE_ALERTS = 3;

/** Operational warnings for a reservation: unpaid balance, pending proof, dates. */
export function ReservationAlerts({
  alerts,
  cancellationReason,
  status,
  onApprove,
  onDecline,
  onVerifyTransfer,
}: ReservationAlertsProps) {
  const [showRest, setShowRest] = useState(false);

  const items: AlertItem[] = [];

  if (alerts.roomBlockedOrMaintenance) {
    items.push({
      id: 'room-blocked',
      priority: 3,
      variant: 'destructive',
      icon: <Wrench className="shrink-0" aria-hidden="true" />,
      title: 'Room has conflicting maintenance or schedule block.',
      body: alerts.roomBlockedReason,
      summary: 'Room has a conflicting block or maintenance window.',
    });
  }

  if (alerts.awaitingHotelApproval) {
    items.push({
      id: 'awaiting-approval',
      priority: 2,
      variant: 'brand',
      icon: (
        <AlertTriangle className="shrink-0 text-brand-ink" aria-hidden="true" />
      ),
      title: 'Reservation awaiting hotel approval.',
      body: 'This reservation was submitted under manual confirmation mode.',
      summary: 'Reservation is awaiting hotel approval.',
      action:
        onApprove || onDecline ? (
          <div className="col-start-1 row-start-2 flex items-center gap-2 sm:col-start-2 sm:row-start-1 sm:self-center">
            {onApprove && (
              <Button type="button" size="sm" onClick={onApprove}>
                <Check className="size-3.5" aria-hidden="true" />
                <span>Approve</span>
              </Button>
            )}
            {onDecline && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDecline}
              >
                <X className="size-3.5" aria-hidden="true" />
                <span>Decline</span>
              </Button>
            )}
          </div>
        ) : undefined,
    });
  }

  if (alerts.bankTransferPendingVerification) {
    items.push({
      id: 'transfer-verification',
      priority: 1,
      variant: 'brand',
      icon: (
        <CreditCard className="shrink-0 text-brand-ink" aria-hidden="true" />
      ),
      title: 'Bank transfer payment awaiting verification.',
      body: 'A guest has submitted bank transfer proof. Please inspect the receipt in the Payments panel.',
      summary: 'A bank transfer receipt needs verifying.',
      action: onVerifyTransfer ? (
        <Button
          type="button"
          size="sm"
          onClick={onVerifyTransfer}
          className="col-start-1 row-start-2 shrink-0 justify-self-start sm:col-start-2 sm:row-start-1 sm:self-center"
        >
          Verify transfer receipt
        </Button>
      ) : undefined,
    });
  }

  if (alerts.holdExpiringSoon) {
    items.push({
      id: 'hold-expiring',
      priority: 4,
      variant: 'warning',
      icon: <Clock className="shrink-0" aria-hidden="true" />,
      title: 'Hold expires in less than 10 minutes.',
      summary: 'The payment hold expires within 10 minutes.',
    });
  }

  if (alerts.balanceDueArrivingSoon) {
    items.push({
      id: 'balance-due',
      priority: 5,
      variant: 'warning',
      icon: <CreditCard className="shrink-0" aria-hidden="true" />,
      title: 'Balance due with arrival in less than 48 hours.',
      body: 'Arrival is approaching and full payment has not been received.',
      summary: 'A balance is due and arrival is under 48 hours away.',
    });
  }

  if (alerts.failedNotification) {
    items.push({
      id: 'failed-notification',
      priority: 6,
      variant: 'warning',
      icon: <MailWarning className="shrink-0" aria-hidden="true" />,
      title: 'Confirmation notification failed to deliver.',
      body: 'One or more outgoing messages could not be sent. Check the Notifications panel.',
      summary: 'A confirmation notification failed to deliver.',
    });
  }

  if (status === 'cancelled') {
    items.push({
      id: 'cancelled',
      priority: 7,
      variant: 'neutral',
      icon: <AlertCircle className="shrink-0" aria-hidden="true" />,
      title: 'This booking has been cancelled.',
      body: cancellationReason ? `Reason: ${cancellationReason}` : undefined,
      summary: 'This booking has been cancelled.',
    });
  }

  if (status === 'expired') {
    items.push({
      id: 'expired',
      priority: 8,
      variant: 'neutral',
      icon: <Clock className="shrink-0" aria-hidden="true" />,
      title: 'Hold expired.',
      body: 'The payment deadline for this booking hold has passed.',
      summary: 'The payment hold has expired.',
    });
  }

  if (items.length === 0) return null;

  items.sort((a, b) => a.priority - b.priority);
  const visible = items.slice(0, MAX_VISIBLE_ALERTS);
  const overflow = items.slice(MAX_VISIBLE_ALERTS);

  return (
    <div className="space-y-2.5">
      {visible.map((item) => (
        <Alert
          key={item.id}
          role={item.action ? 'status' : undefined}
          variant={item.variant}
          className={
            item.action
              ? 'gap-3 sm:grid-cols-[1fr_auto] sm:items-center'
              : 'items-start gap-2.5'
          }
        >
          {item.action ? (
            <>
              <div className="col-start-1 flex items-start gap-2.5">
                {item.icon}
                <div>
                  <span className="font-semibold">{item.title}</span>
                  {item.body && (
                    <p className="text-caption text-muted-foreground">
                      {item.body}
                    </p>
                  )}
                </div>
              </div>
              {item.action}
            </>
          ) : (
            <>
              {item.icon}
              <div>
                <span className="font-semibold">{item.title}</span>
                {item.body && (
                  <p className="mt-0.5 text-caption opacity-90">{item.body}</p>
                )}
              </div>
            </>
          )}
        </Alert>
      ))}

      {overflow.length > 0 && (
        <Alert variant="neutral" size="sm" role="status">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">
              {overflow.length} further note{overflow.length === 1 ? '' : 's'}{' '}
              on this booking
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setShowRest((prev) => !prev)}
              aria-expanded={showRest}
            >
              {showRest ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showRest && (
            <ul className="mt-1 space-y-1">
              {overflow.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2 text-caption"
                >
                  {item.icon}
                  <span>{item.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </div>
  );
}
