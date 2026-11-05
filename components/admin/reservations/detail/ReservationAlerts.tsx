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

export function ReservationAlerts({
  alerts,
  cancellationReason,
  status,
  onApprove,
  onDecline,
  onVerifyTransfer,
}: ReservationAlertsProps) {
  const hasAnyAlert =
    alerts.bankTransferPendingVerification ||
    alerts.awaitingHotelApproval ||
    alerts.holdExpiringSoon ||
    alerts.holdExpired ||
    alerts.balanceDueArrivingSoon ||
    alerts.roomBlockedOrMaintenance ||
    alerts.failedNotification ||
    status === 'cancelled' ||
    status === 'expired';

  if (!hasAnyAlert) return null;

  return (
    <div className="space-y-2.5">
      {/* Cancelled / Expired Visual Treatment */}
      {status === 'cancelled' && (
        <Alert variant="destructive" className="items-start gap-2.5">
          <AlertCircle className="shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">This booking has been cancelled.</p>
            {cancellationReason && (
              <p className="mt-0.5 text-caption">
                Reason: {cancellationReason}
              </p>
            )}
          </div>
        </Alert>
      )}

      {status === 'expired' && (
        <Alert
          variant="neutral"
          className="items-start gap-2.5 text-muted-foreground"
        >
          <Clock className="shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">Hold expired.</p>
            <p className="text-caption">
              The payment deadline for this booking hold has passed.
            </p>
          </div>
        </Alert>
      )}

      {/* Bank transfer proof awaiting verification */}
      {alerts.bankTransferPendingVerification && (
        <Alert
          role="status"
          variant="brand"
          className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="col-start-1 flex items-start gap-2.5">
            <CreditCard
              className="shrink-0 text-brand-ink"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold">
                Bank transfer payment awaiting verification.
              </span>
              <p className="text-caption text-muted-foreground">
                A guest has submitted bank transfer proof. Please inspect the
                receipt in the Payments panel.
              </p>
            </div>
          </div>

          {onVerifyTransfer && (
            <Button
              type="button"
              size="sm"
              onClick={onVerifyTransfer}
              className="col-start-1 row-start-2 shrink-0 justify-self-start sm:col-start-2 sm:row-start-1 sm:self-center"
            >
              Verify transfer receipt
            </Button>
          )}
        </Alert>
      )}

      {/* Awaiting hotel approval */}
      {alerts.awaitingHotelApproval && (
        <Alert
          role="status"
          variant="brand"
          className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="col-start-1 flex items-start gap-2.5">
            <AlertTriangle
              className="shrink-0 text-brand-ink"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold">
                Reservation awaiting hotel approval.
              </span>
              <p className="text-caption text-muted-foreground">
                This reservation was submitted under manual confirmation mode.
              </p>
            </div>
          </div>

          {(onApprove || onDecline) && (
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
          )}
        </Alert>
      )}

      {/* Hold expiring soon */}
      {alerts.holdExpiringSoon && (
        <Alert className="items-start gap-2.5" variant="destructive">
          <Clock className="shrink-0" aria-hidden="true" />
          <span className="font-semibold">
            Hold expires in less than 10 minutes.
          </span>
        </Alert>
      )}

      {/* Balance due arriving soon */}
      {alerts.balanceDueArrivingSoon && (
        <Alert
          role="status"
          variant="destructive"
          className="items-start gap-2.5"
        >
          <CreditCard className="shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Balance due with arrival in less than 48 hours.
            </span>
            <p className="text-caption opacity-90">
              Arrival is approaching and full payment has not been received.
            </p>
          </div>
        </Alert>
      )}

      {/* Room in Maintenance or Blocked */}
      {alerts.roomBlockedOrMaintenance && (
        <Alert variant="destructive" className="items-start gap-2.5">
          <Wrench className="shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Warning: Room has conflicting maintenance or schedule block!
            </span>
            {alerts.roomBlockedReason && (
              <p className="mt-0.5 text-caption opacity-90">
                {alerts.roomBlockedReason}
              </p>
            )}
          </div>
        </Alert>
      )}

      {/* Notification delivery failure */}
      {alerts.failedNotification && (
        <Alert variant="destructive" className="items-start gap-2.5">
          <MailWarning className="shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Confirmation notification failed to deliver.
            </span>
            <p className="mt-0.5 text-caption opacity-90">
              One or more outgoing messages could not be sent. Check the
              Notifications panel.
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}
