'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AdminError, AdminLoading } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { AdminRole, Permission } from '@/types/auth.types';
import type {
  ReservationDetail,
  ReservationNeighbors,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ApproveDeclineModal } from '../actions/ApproveDeclineModal';
import { CancelModal } from '../actions/CancelModal';
import { ChangeDatesModal } from '../actions/ChangeDatesModal';
import { EditDetailsModal } from '../actions/EditDetailsModal';
import { MarkNoShowModal } from '../actions/MarkNoShowModal';
import { ReassignRoomModal } from '../actions/ReassignRoomModal';
import { RecordPaymentModal } from '../actions/RecordPaymentModal';
import { RefundModal } from '../actions/RefundModal';
import { ResendConfirmationModal } from '../actions/ResendConfirmationModal';
import { VerifyTransferModal } from '../actions/VerifyTransferModal';
import { AuditLogCard } from './AuditLogCard';
import { GuestInfoCard } from './GuestInfoCard';
import { NotificationsCard } from './NotificationsCard';
import { PaymentsPanel } from './PaymentsPanel';
import { PolicySnapshotCard } from './PolicySnapshotCard';
import { PriceBreakdownCard } from './PriceBreakdownCard';
import { RatesAndExtrasCard } from './RatesAndExtrasCard';
import { ReservationAlerts } from './ReservationAlerts';
import { ReservationDetailHeader } from './ReservationDetailHeader';
import { StayInfoCard } from './StayInfoCard';
import { TimelineCard } from './TimelineCard';

type ActiveModal =
  | null
  | 'edit'
  | 'change_dates'
  | 'reassign_room'
  | 'record_payment'
  | 'cancel'
  | 'no_show'
  | 'resend'
  | { type: 'verify_transfer'; payment: ReservationPaymentItem }
  | { type: 'refund'; payment: ReservationPaymentItem }
  | { type: 'approve_decline'; initialAction: 'approve' | 'decline' };

interface ReservationDetailClientProps {
  initialDetail: ReservationDetail | null;
  reservationId: string;
  role: AdminRole;
  permissions: readonly Permission[];
}

export function ReservationDetailClient({
  initialDetail,
  reservationId,
}: ReservationDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [detail, setDetail] = useState<ReservationDetail | null>(initialDetail);
  const [isLoading, setIsLoading] = useState(!initialDetail);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const [neighbors, setNeighbors] = useState<ReservationNeighbors>({
    prevId: null,
    nextId: null,
  });

  const [hasNewerVersion, setHasNewerVersion] = useState(false);

  // Load detail if not provided initially
  const loadDetail = useCallback(
    async (isQuiet = false) => {
      if (!isQuiet) setIsLoading(true);
      try {
        const { adminService } =
          await import('@/app/api/services/admin.service');
        const res = await adminService.getReservationDetail(reservationId);
        if (res.data) {
          if (detail && res.data.updatedAt !== detail.updatedAt) {
            setHasNewerVersion(true);
          } else {
            setDetail(res.data);
            setHasNewerVersion(false);
            setError(null);
          }
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_BOOKING;
        setError(msg);
      } finally {
        if (!isQuiet) setIsLoading(false);
      }
    },
    [reservationId, detail],
  );

  // Fetch neighbors
  useEffect(() => {
    let isMounted = true;
    import('@/app/api/services/admin.service').then(({ adminService }) => {
      adminService
        .getReservationNeighbors(reservationId, searchParams.toString())
        .then((res) => {
          if (isMounted && res.data) {
            setNeighbors(res.data);
          }
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [reservationId, searchParams]);

  // Silent 45-second concurrency polling
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDetail(true);
      }
    }, 45000);

    return () => clearInterval(timer);
  }, [loadDetail]);

  const handleApplyUpdate = () => {
    loadDetail(false);
  };

  const handleActionSuccess = (
    updated?: ReservationDetail,
    message?: string,
  ) => {
    if (message) {
      toast.add({ title: message, type: 'success' });
    }
    if (updated) {
      setDetail(updated);
    } else {
      loadDetail(false);
    }
  };

  const backUrl = `/admin/reservations${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;

  return (
    <div className="space-y-5">
      {/* Top Navigation Row: Back Link & Prev/Next within current filter */}
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <Link
          href={backUrl}
          className="rounded-control text-small text-muted-foreground hover:bg-paper hover:text-ink inline-flex min-h-10 items-center gap-1.5 px-2.5 font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to reservations</span>
        </Link>

        {/* Previous / Next buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!neighbors.prevId}
            onClick={() => {
              if (neighbors.prevId) {
                router.push(
                  `/admin/reservations/${neighbors.prevId}?${searchParams.toString()}`,
                );
              }
            }}
            icon={<ChevronLeft className="size-4" aria-hidden="true" />}
          >
            Previous
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!neighbors.nextId}
            onClick={() => {
              if (neighbors.nextId) {
                router.push(
                  `/admin/reservations/${neighbors.nextId}?${searchParams.toString()}`,
                );
              }
            }}
          >
            <span>Next</span>
            <ChevronRight className="ml-1 size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Concurrency Notification Banner */}
      {hasNewerVersion && (
        <div
          role="status"
          className="rounded-control border-primary/40 bg-primary/15 text-small text-ink flex items-center justify-between gap-3 border p-3.5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="text-brand-ink size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="font-semibold">
              This reservation was updated in another session.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyUpdate}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Refresh latest version</span>
          </Button>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && !detail ? (
        <AdminLoading label="Loading reservation details…" />
      ) : error && !detail ? (
        <AdminError
          message={error}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadDetail(false)}
            >
              Retry
            </Button>
          }
        />
      ) : detail ? (
        <div className="space-y-6">
          {/* Header */}
          <ReservationDetailHeader
            reservation={detail}
            onAction={(action) => setActiveModal(action)}
          />

          {/* Operational Alerts */}
          <ReservationAlerts
            alerts={detail.alerts}
            cancellationReason={detail.cancellationReason}
            status={detail.status}
            onApprove={() =>
              setActiveModal({
                type: 'approve_decline',
                initialAction: 'approve',
              })
            }
            onDecline={() =>
              setActiveModal({
                type: 'approve_decline',
                initialAction: 'decline',
              })
            }
            onVerifyTransfer={() => {
              const pendingTransfer = detail.payments?.find(
                (p) => p.provider === 'bank_transfer' && p.status === 'pending',
              );
              if (pendingTransfer) {
                setActiveModal({
                  type: 'verify_transfer',
                  payment: pendingTransfer,
                });
              }
            }}
          />

          {/* Two-Column Responsive Layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Stay, Guest, Rates, Price */}
            <div className="space-y-6">
              <StayInfoCard reservation={detail} />
              <GuestInfoCard reservation={detail} />
              <RatesAndExtrasCard reservation={detail} />
              <PriceBreakdownCard reservation={detail} />
            </div>

            {/* Right Column: Timeline, Payments, Policy, Notifications, Audit */}
            <div className="space-y-6">
              <TimelineCard history={detail.statusHistory} />
              <PaymentsPanel
                payments={detail.payments}
                reservationId={detail.id}
                canRefund={detail.allowedActions.refund.allowed}
                canVerifyTransfer={
                  detail.allowedActions.verify_bank_transfer.allowed
                }
                onVerifyTransfer={(payment) =>
                  setActiveModal({ type: 'verify_transfer', payment })
                }
                onRefund={(payment) =>
                  setActiveModal({ type: 'refund', payment })
                }
              />
              <PolicySnapshotCard policy={detail.policySnapshot} />
              <NotificationsCard notifications={detail.notifications} />
              <AuditLogCard auditLogs={detail.auditLogs} />
            </div>
          </div>

          {/* Active Modal Dialogs */}
          {activeModal === 'edit' && (
            <EditDetailsModal
              open={activeModal === 'edit'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'reassign_room' && (
            <ReassignRoomModal
              open={activeModal === 'reassign_room'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'change_dates' && (
            <ChangeDatesModal
              open={activeModal === 'change_dates'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'record_payment' && (
            <RecordPaymentModal
              open={activeModal === 'record_payment'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'cancel' && (
            <CancelModal
              open={activeModal === 'cancel'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'no_show' && (
            <MarkNoShowModal
              open={activeModal === 'no_show'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={handleActionSuccess}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {activeModal === 'resend' && (
            <ResendConfirmationModal
              open={activeModal === 'resend'}
              onClose={() => setActiveModal(null)}
              reservation={detail}
              onSuccess={() => handleActionSuccess()}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {typeof activeModal === 'object' &&
            activeModal?.type === 'verify_transfer' && (
              <VerifyTransferModal
                open={Boolean(activeModal)}
                onClose={() => setActiveModal(null)}
                reservation={detail}
                payment={activeModal.payment}
                onSuccess={handleActionSuccess}
                onRefresh={() => loadDetail(false)}
              />
            )}

          {typeof activeModal === 'object' &&
            activeModal?.type === 'refund' && (
              <RefundModal
                open={Boolean(activeModal)}
                onClose={() => setActiveModal(null)}
                reservation={detail}
                payment={activeModal.payment}
                onSuccess={handleActionSuccess}
                onRefresh={() => loadDetail(false)}
              />
            )}

          {typeof activeModal === 'object' &&
            activeModal?.type === 'approve_decline' && (
              <ApproveDeclineModal
                open={Boolean(activeModal)}
                onClose={() => setActiveModal(null)}
                reservation={detail}
                initialAction={activeModal.initialAction}
                onSuccess={handleActionSuccess}
                onRefresh={() => loadDetail(false)}
              />
            )}
        </div>
      ) : null}
    </div>
  );
}
