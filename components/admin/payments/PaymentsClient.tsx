'use client';

import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useManualRefunds,
  useMarkManualRefundPaidOut,
  usePaymentDetail,
  usePayments,
  usePaymentsSummary,
  useRecheckRefundStatus,
  useReconcilePayments,
  useReprocessWebhookEvent,
  useUnreconcilePayment,
  useWebhookEvents,
} from '@/hooks/services/admin/use-payments';
import type {
  ManualRefundPayoutInput,
  PaymentDetailResponse,
  PaymentListItem,
  PaymentsQueryParams,
} from '@/types/payments.types';

import { ManualRefundsTab } from './ManualRefundsTab';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';
import { PaymentsBreakdown } from './PaymentsBreakdown';
import { PaymentsFilterDrawer } from './PaymentsFilterDrawer';
import { PaymentsSummaryCards } from './PaymentsSummaryCards';
import { PaymentsTable } from './PaymentsTable';
import { ReconciliationModal } from './ReconciliationModal';
import { WebhooksTab } from './WebhooksTab';

function buildFallbackDetail(
  paymentItem: PaymentListItem,
): PaymentDetailResponse {
  return {
    ...paymentItem,
    reservation: {
      id: paymentItem.reservationId,
      reference: paymentItem.reservationRef,
      guestName: paymentItem.guestName,
      guestEmail: paymentItem.guestEmail,
      roomTypeName: 'Standard Room',
      checkIn: '',
      checkOut: '',
      nights: 1,
      status: 'confirmed',
      totalMinor: paymentItem.amountMinor,
      amountPaidMinor: paymentItem.amountMinor,
      amountRefundedMinor: 0,
    },
    webhooks: [],
  };
}

export function PaymentsClient({ isOwner = false }: { isOwner?: boolean }) {
  const [activeTab, setActiveTab] = useState<
    'payments' | 'refunds' | 'webhooks'
  >('payments');

  const [rangePreset, setRangePreset] = useState<string>('this_month');

  // Payments list & filters
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<PaymentsQueryParams>({
    status: 'all',
    type: 'all',
    provider: 'all',
    method: 'all',
    dateField: 'created',
    reconciled: 'all',
    page: 1,
    pageSize: 25,
    sort: 'created_at',
    order: 'desc',
  });

  const [detailSelection, setDetailSelection] =
    useState<PaymentListItem | null>(null);
  const [reconcileModalState, setReconcileModalState] = useState<{
    isOpen: boolean;
    mode: 'reconcile' | 'unreconcile';
    paymentIds: string[];
  }>({
    isOpen: false,
    mode: 'reconcile',
    paymentIds: [],
  });

  const isUserInteracting = useRef(false);

  const summaryQuery = usePaymentsSummary();
  const paymentsQuery = usePayments(filters);
  const refundsQuery = useManualRefunds();
  const webhooksQuery = useWebhookEvents();
  const detailQuery = usePaymentDetail(detailSelection?.id ?? null);

  const reconcilePayments = useReconcilePayments();
  const unreconcilePayment = useUnreconcilePayment();
  const markRefundPaidOut = useMarkManualRefundPaidOut();
  const recheckRefundStatus = useRecheckRefundStatus();
  const reprocessWebhookEvent = useReprocessWebhookEvent();

  const { refetch: refetchSummary } = summaryQuery;
  const { refetch: refetchPayments } = paymentsQuery;
  const { refetch: refetchRefunds } = refundsQuery;
  const { refetch: refetchWebhooks } = webhooksQuery;

  const summary = summaryQuery.data?.summary ?? null;
  const breakdown = summaryQuery.data?.breakdown ?? null;
  const payments = paymentsQuery.data?.items ?? [];
  const totalPayments = paymentsQuery.data?.total ?? 0;
  const manualRefunds = refundsQuery.data ?? [];
  const webhooks = webhooksQuery.data?.items ?? [];
  const loading =
    summaryQuery.isPending ||
    paymentsQuery.isPending ||
    refundsQuery.isPending ||
    webhooksQuery.isPending;
  const error = paymentsQuery.error
    ? paymentsQuery.error instanceof Error
      ? paymentsQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_PAYMENTS
    : null;
  const detailPayment =
    detailQuery.data ??
    (detailSelection && detailQuery.isError
      ? buildFallbackDetail(detailSelection)
      : null);

  // Quiet 60s background refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        document.hidden ||
        isUserInteracting.current ||
        detailSelection !== null ||
        reconcileModalState.isOpen
      ) {
        return;
      }
      void refetchSummary();
      void refetchPayments();
      void refetchRefunds();
      void refetchWebhooks();
    }, 60_000);

    return () => clearInterval(timer);
  }, [
    refetchSummary,
    refetchPayments,
    refetchRefunds,
    refetchWebhooks,
    detailSelection,
    reconcileModalState.isOpen,
  ]);

  // Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedPaymentIds(checked ? payments.map((p) => p.id) : []);
  };

  const handleOpenDetail = (paymentItem: PaymentListItem) => {
    setDetailSelection(paymentItem);
  };

  const handleConfirmReconcile = async (note?: string) => {
    try {
      await reconcilePayments.mutateAsync({
        paymentIds: reconcileModalState.paymentIds,
        note,
      });
      setReconcileModalState({
        isOpen: false,
        mode: 'reconcile',
        paymentIds: [],
      });
      setSelectedPaymentIds([]);
      setDetailSelection(null);
      toast.add({
        title: SUCCESS_MESSAGES.PAYMENTS_RECONCILED,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_RECONCILE;
      toast.add({ title: msg, type: 'error', priority: 'high' });
    }
  };

  const handleConfirmUnreconcile = async (reason: string) => {
    try {
      const paymentId = reconcileModalState.paymentIds[0];
      if (paymentId) {
        await unreconcilePayment.mutateAsync({ id: paymentId, reason });
      }
      setReconcileModalState({
        isOpen: false,
        mode: 'unreconcile',
        paymentIds: [],
      });
      setDetailSelection(null);
      toast.add({
        title: SUCCESS_MESSAGES.PAYMENT_UNRECONCILED,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_UNRECONCILE;
      toast.add({ title: msg, type: 'error', priority: 'high' });
    }
  };

  const handleMarkRefundPaidOut = async (
    id: string,
    input: ManualRefundPayoutInput,
  ) => {
    await markRefundPaidOut.mutateAsync({ id, body: input });
  };

  const handleRecheckProviderRefund = async (id: string) => {
    const res = await recheckRefundStatus.mutateAsync(id);
    return res.message || SUCCESS_MESSAGES.STATUS_VERIFIED;
  };

  const handleReprocessWebhook = async (id: string) => {
    await reprocessWebhookEvent.mutateAsync(id);
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    const link = document.createElement('a');
    link.href = `/api/admin/payments/export?${q.toString()}`;
    link.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PaymentsSummaryCards
        summary={summary}
        loading={loading}
        selectedRange={rangePreset}
        onRangeShortcut={(preset) => {
          setRangePreset(preset);
          void refetchSummary();
        }}
      />

      {/* Visual Volume Breakdown */}
      <PaymentsBreakdown breakdown={breakdown} loading={loading} />

      {/* Tabs Navigation */}
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as 'payments' | 'refunds' | 'webhooks')
          }
        >
          <TabsList variant="line" className="h-auto gap-2 p-0">
            <TabsTrigger value="payments" className="pb-2 font-semibold">
              Payments Register ({totalPayments})
            </TabsTrigger>
            <TabsTrigger
              value="refunds"
              className="flex items-center gap-1.5 pb-2 font-semibold"
            >
              Manual Refunds Due
              {manualRefunds.length > 0 && (
                <span className="text-caption bg-primary/15 text-brand-ink rounded-full px-2 py-0.5 font-bold">
                  {manualRefunds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="flex items-center gap-1.5 pb-2 font-semibold"
            >
              Webhook Events
              {webhooks.some((w) => w.isOverdue) && (
                <span className="bg-destructive/10 text-caption text-destructive rounded-full px-2 py-0.5 font-bold">
                  !
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'payments' && selectedPaymentIds.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setReconcileModalState({
                  isOpen: true,
                  mode: 'reconcile',
                  paymentIds: selectedPaymentIds,
                });
              }}
            >
              Mark {selectedPaymentIds.length} Selected as Reconciled
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            title="Download CSV of current filtered view (max 10,000 rows)"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchSummary();
              void refetchPayments();
              void refetchRefunds();
              void refetchWebhooks();
            }}
            title="Refresh payments data"
            className="px-2"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* TAB 1: Payments Register */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <PaymentsFilterDrawer
            filters={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onReset={() =>
              setFilters({
                status: 'all',
                type: 'all',
                provider: 'all',
                method: 'all',
                dateField: 'created',
                reconciled: 'all',
                page: 1,
                pageSize: 25,
                sort: 'created_at',
                order: 'desc',
              })
            }
          />

          {loading ? (
            <AdminLoading label="Loading payments register..." />
          ) : error ? (
            <AdminError
              message={error}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchPayments()}
                >
                  Retry
                </Button>
              }
            />
          ) : payments.length === 0 ? (
            <AdminEmpty title="No payments match your filters">
              Try adjusting your date range or clearing selected filter chips.
            </AdminEmpty>
          ) : (
            <div className="space-y-3">
              <PaymentsTable
                items={payments}
                selectedIds={selectedPaymentIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onRowClick={handleOpenDetail}
              />
              <div className="bg-muted/30 border-line text-caption text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <span>
                  Showing {payments.length} of {totalPayments} payment record(s)
                </span>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            page: Math.max(1, (prev.page ?? 1) - 1),
                          }))
                        }
                        disabled={(filters.page ?? 1) <= 1}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-caption text-muted-foreground px-2 font-medium">
                        Page {filters.page ?? 1} of{' '}
                        {Math.max(
                          1,
                          Math.ceil(totalPayments / (filters.pageSize ?? 25)),
                        )}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            page: (prev.page ?? 1) + 1,
                          }))
                        }
                        disabled={
                          (filters.page ?? 1) >=
                          Math.ceil(totalPayments / (filters.pageSize ?? 25))
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Manual Refunds Due */}
      {activeTab === 'refunds' && (
        <ManualRefundsTab
          refunds={manualRefunds}
          loading={loading}
          onMarkPaidOut={handleMarkRefundPaidOut}
          onRecheckProvider={handleRecheckProviderRefund}
        />
      )}

      {/* TAB 3: Webhook Events */}
      {activeTab === 'webhooks' && (
        <WebhooksTab
          events={webhooks}
          loading={loading}
          onReprocess={handleReprocessWebhook}
          isOwner={isOwner}
        />
      )}

      {/* Detail Drawer */}
      {detailPayment && (
        <PaymentDetailDrawer
          payment={detailPayment}
          isOwner={isOwner}
          onClose={() => setDetailSelection(null)}
          onReconcile={(id) => {
            setReconcileModalState({
              isOpen: true,
              mode: 'reconcile',
              paymentIds: [id],
            });
          }}
          onUnreconcile={(id) => {
            setReconcileModalState({
              isOpen: true,
              mode: 'unreconcile',
              paymentIds: [id],
            });
          }}
        />
      )}

      {/* Reconciliation Modal */}
      <ReconciliationModal
        isOpen={reconcileModalState.isOpen}
        mode={reconcileModalState.mode}
        paymentIds={reconcileModalState.paymentIds}
        onClose={() =>
          setReconcileModalState({
            isOpen: false,
            mode: 'reconcile',
            paymentIds: [],
          })
        }
        onConfirmReconcile={handleConfirmReconcile}
        onConfirmUnreconcile={handleConfirmUnreconcile}
        loading={reconcilePayments.isPending || unreconcilePayment.isPending}
      />
    </div>
  );
}
