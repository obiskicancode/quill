'use client';

import { Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
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
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type {
  ManualRefundItem,
  ManualRefundPayoutInput,
  PaymentDetailResponse,
  PaymentListItem,
  PaymentsBreakdownResponse,
  PaymentsQueryParams,
  PaymentSummaryResponse,
  WebhookEventItem,
} from '@/types/payments-admin.types';

import { ManualRefundsTab } from './ManualRefundsTab';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';
import { PaymentsBreakdown } from './PaymentsBreakdown';
import { PaymentsFilterDrawer } from './PaymentsFilterDrawer';
import { PaymentsSummaryCards } from './PaymentsSummaryCards';
import { PaymentsTable } from './PaymentsTable';
import { ReconciliationModal } from './ReconciliationModal';
import { WebhooksTab } from './WebhooksTab';

export function PaymentsClient({ isOwner = false }: { isOwner?: boolean }) {
  const [activeTab, setActiveTab] = useState<
    'payments' | 'refunds' | 'webhooks'
  >('payments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary and breakdown
  const [summary, setSummary] = useState<PaymentSummaryResponse | null>(null);
  const [breakdown, setBreakdown] = useState<PaymentsBreakdownResponse | null>(
    null,
  );
  const [rangePreset, setRangePreset] = useState<string>('this_month');

  // Payments list & filters
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
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

  // Manual refunds & webhooks
  const [manualRefunds, setManualRefunds] = useState<ManualRefundItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEventItem[]>([]);

  // Drawers and modals
  const [detailPayment, setDetailPayment] =
    useState<PaymentDetailResponse | null>(null);
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

  // Fetch summary data
  const loadSummary = useCallback(async () => {
    try {
      const res = await adminService.getPaymentsSummary();
      if (res.data) {
        setSummary(res.data.summary);
        setBreakdown(res.data.breakdown);
      }
    } catch {
      // quiet fallback
    }
  }, []);

  // Fetch payments list
  const loadPayments = useCallback(async () => {
    try {
      const res = await adminService.listPayments(filters);
      if (res.data) {
        setError(null);
        setPayments(res.data.items);
        setTotalPayments(res.data.total);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_LOAD_PAYMENTS;
      setError(msg);
    }
  }, [filters]);

  // Fetch refunds and webhooks
  const loadRefundsAndWebhooks = useCallback(async () => {
    try {
      const [refRes, whRes] = await Promise.all([
        adminService.listManualRefunds(),
        adminService.listWebhookEvents(),
      ]);
      if (refRes.data) setManualRefunds(refRes.data);
      if (whRes.data) setWebhooks(whRes.data.items);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const [sumRes, payRes, refRes, whRes] = await Promise.all([
          adminService.getPaymentsSummary(),
          adminService.listPayments(filters),
          adminService.listManualRefunds(),
          adminService.listWebhookEvents(),
        ]);
        if (!active) return;
        if (sumRes.data) {
          setSummary(sumRes.data.summary);
          setBreakdown(sumRes.data.breakdown);
        }
        if (payRes.data) {
          setPayments(payRes.data.items);
          setTotalPayments(payRes.data.total);
          setError(null);
        }
        if (refRes.data) setManualRefunds(refRes.data);
        if (whRes.data) setWebhooks(whRes.data.items);
      } catch (err: unknown) {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_PAYMENTS;
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, [filters]);

  // Quiet 60s background refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        document.hidden ||
        isUserInteracting.current ||
        detailPayment !== null ||
        reconcileModalState.isOpen
      ) {
        return;
      }
      void loadSummary();
      void loadPayments();
      void loadRefundsAndWebhooks();
    }, 60_000);

    return () => clearInterval(timer);
  }, [
    loadSummary,
    loadPayments,
    loadRefundsAndWebhooks,
    detailPayment,
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

  const handleOpenDetail = async (paymentItem: PaymentListItem) => {
    try {
      const res = await adminService.getPaymentDetail(paymentItem.id);
      if (res.data) {
        setDetailPayment(res.data);
      } else {
        setDetailPayment({
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
        });
      }
    } catch {
      setDetailPayment({
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
      });
    }
  };

  const handleConfirmReconcile = async (note?: string) => {
    try {
      await adminService.reconcilePaymentsBulk({
        paymentIds: reconcileModalState.paymentIds,
        note,
      });
      setReconcileModalState({
        isOpen: false,
        mode: 'reconcile',
        paymentIds: [],
      });
      setSelectedPaymentIds([]);
      if (detailPayment) setDetailPayment(null);
      await Promise.all([loadSummary(), loadPayments()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_RECONCILE;
      alert(msg);
    }
  };

  const handleConfirmUnreconcile = async (reason: string) => {
    try {
      const paymentId = reconcileModalState.paymentIds[0];
      if (paymentId) {
        await adminService.unreconcilePayment(paymentId, reason);
      }
      setReconcileModalState({
        isOpen: false,
        mode: 'unreconcile',
        paymentIds: [],
      });
      if (detailPayment) setDetailPayment(null);
      await Promise.all([loadSummary(), loadPayments()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_UNRECONCILE;
      alert(msg);
    }
  };

  const handleMarkRefundPaidOut = async (
    id: string,
    input: ManualRefundPayoutInput,
  ) => {
    await adminService.markManualRefundPaidOut(id, input);
    await Promise.all([
      loadSummary(),
      loadPayments(),
      loadRefundsAndWebhooks(),
    ]);
  };

  const handleRecheckProviderRefund = async (id: string) => {
    const res = await adminService.recheckRefundStatus(id);
    return res.data?.message || SUCCESS_MESSAGES.STATUS_VERIFIED;
  };

  const handleReprocessWebhook = async (id: string) => {
    await adminService.reprocessWebhookEvent(id);
    await loadRefundsAndWebhooks();
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
          loadSummary();
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
              loadSummary();
              loadPayments();
              loadRefundsAndWebhooks();
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
                <Button variant="outline" size="sm" onClick={loadPayments}>
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
          onClose={() => setDetailPayment(null)}
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
      />
    </div>
  );
}
