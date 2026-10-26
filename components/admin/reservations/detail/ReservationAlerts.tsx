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
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/5 text-small text-destructive flex items-start gap-2.5 border p-3.5"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">This booking has been cancelled.</p>
            {cancellationReason && (
              <p className="text-caption mt-0.5">
                Reason: {cancellationReason}
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div
          role="alert"
          className="rounded-control border-line bg-paper text-small text-muted-foreground flex items-start gap-2.5 border p-3.5"
        >
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-ink font-semibold">Hold expired.</p>
            <p className="text-caption">
              The payment deadline for this booking hold has passed.
            </p>
          </div>
        </div>
      )}

      {/* Bank transfer proof awaiting verification */}
      {alerts.bankTransferPendingVerification && (
        <div
          role="status"
          className="rounded-control border-primary/40 bg-primary/10 text-small text-ink flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <CreditCard
              className="text-brand-ink mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <span className="text-brand-ink font-semibold">
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
              className="shrink-0 self-start sm:self-auto"
            >
              Verify transfer receipt
            </Button>
          )}
        </div>
      )}

      {/* Awaiting hotel approval */}
      {alerts.awaitingHotelApproval && (
        <div
          role="status"
          className="rounded-control border-primary/40 bg-primary/10 text-small text-ink flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="text-brand-ink mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <span className="text-brand-ink font-semibold">
                Reservation awaiting hotel approval.
              </span>
              <p className="text-caption text-muted-foreground">
                This reservation was submitted under manual confirmation mode.
              </p>
            </div>
          </div>

          {(onApprove || onDecline) && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
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
        </div>
      )}

      {/* Hold expiring soon */}
      {alerts.holdExpiringSoon && (
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/5 text-small text-destructive flex items-start gap-2.5 border p-3.5"
        >
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold">
            Hold expires in less than 10 minutes.
          </span>
        </div>
      )}

      {/* Balance due arriving soon */}
      {alerts.balanceDueArrivingSoon && (
        <div
          role="status"
          className="rounded-control border-destructive/30 bg-destructive/5 text-small text-destructive flex items-start gap-2.5 border p-3.5"
        >
          <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Balance due with arrival in less than 48 hours.
            </span>
            <p className="text-caption opacity-90">
              Arrival is approaching and full payment has not been received.
            </p>
          </div>
        </div>
      )}

      {/* Room in Maintenance or Blocked */}
      {alerts.roomBlockedOrMaintenance && (
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/5 text-small text-destructive flex items-start gap-2.5 border p-3.5"
        >
          <Wrench className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Warning: Room has conflicting maintenance or schedule block!
            </span>
            {alerts.roomBlockedReason && (
              <p className="text-caption mt-0.5 opacity-90">
                {alerts.roomBlockedReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notification delivery failure */}
      {alerts.failedNotification && (
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/5 text-small text-destructive flex items-start gap-2.5 border p-3.5"
        >
          <MailWarning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              Confirmation notification failed to deliver.
            </span>
            <p className="text-caption mt-0.5 opacity-90">
              One or more outgoing messages could not be sent. Check the
              Notifications panel.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
