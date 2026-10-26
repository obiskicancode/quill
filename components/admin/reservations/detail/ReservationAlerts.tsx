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
          className="rounded-control border-danger/30 bg-danger/5 text-small text-danger flex items-start gap-2.5 border p-3.5"
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
          className="rounded-control border-line bg-paper text-small text-muted flex items-start gap-2.5 border p-3.5"
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
          className="rounded-control border-accent/40 bg-accent/10 text-small text-ink flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <CreditCard
              className="text-accent-ink mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <span className="text-accent-ink font-semibold">
                Bank transfer payment awaiting verification.
              </span>
              <p className="text-caption text-muted">
                A guest has submitted bank transfer proof. Please inspect the
                receipt in the Payments panel.
              </p>
            </div>
          </div>

          {onVerifyTransfer && (
            <button
              type="button"
              onClick={onVerifyTransfer}
              className="rounded-control border-accent bg-paper text-caption text-accent-ink hover:bg-accent/15 inline-flex shrink-0 items-center self-start border px-3 py-1.5 font-semibold transition-colors sm:self-auto"
            >
              Verify transfer receipt
            </button>
          )}
        </div>
      )}

      {/* Awaiting hotel approval */}
      {alerts.awaitingHotelApproval && (
        <div
          role="status"
          className="rounded-control border-accent/40 bg-accent/10 text-small text-ink flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="text-accent-ink mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <span className="text-accent-ink font-semibold">
                Reservation awaiting hotel approval.
              </span>
              <p className="text-caption text-muted">
                This reservation was submitted under manual confirmation mode.
              </p>
            </div>
          </div>

          {(onApprove || onDecline) && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  className="rounded-control bg-accent text-caption text-paper hover:bg-accent/90 inline-flex items-center gap-1 px-2.5 py-1 font-semibold transition-colors"
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  <span>Approve</span>
                </button>
              )}
              {onDecline && (
                <button
                  type="button"
                  onClick={onDecline}
                  className="rounded-control border-danger/40 bg-paper text-caption text-danger hover:bg-danger/10 inline-flex items-center gap-1 border px-2.5 py-1 font-semibold transition-colors"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span>Decline</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hold expiring soon */}
      {alerts.holdExpiringSoon && (
        <div
          role="alert"
          className="rounded-control border-danger/30 bg-danger/5 text-small text-danger flex items-start gap-2.5 border p-3.5"
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
          className="rounded-control border-danger/30 bg-danger/5 text-small text-danger flex items-start gap-2.5 border p-3.5"
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
          className="rounded-control border-danger/30 bg-danger/5 text-small text-danger flex items-start gap-2.5 border p-3.5"
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
          className="rounded-control border-danger/30 bg-danger/5 text-small text-danger flex items-start gap-2.5 border p-3.5"
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
