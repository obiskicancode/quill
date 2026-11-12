'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Badge } from '@/components/ui/badge';
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

const RANGE_PRESETS = ['today', '7d', 'this_month', 'last_month'] as const;
type RangePreset = (typeof RANGE_PRESETS)[number];

/** The date window a summary preset covers, in ISO instants (local day bounds). */
function rangeToDates(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  switch (preset) {
    case 'today':
      return { from: startOfToday.toISOString(), to: endOfToday.toISOString() };
    case '7d': {
      const from = startOfToday;
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString(), to: endOfToday.toISOString() };
    }
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        to: new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        ).toISOString(),
      };
    default:
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: endOfToday.toISOString(),
      };
  }
}

/** Filter keys that make up the payments register URL state. */
const FILTER_KEYS = [
  'status',
  'type',
  'provider',
  'method',
  'dateField',
  'reconciled',
  'q',
  'from',
  'to',
  'minAmount',
  'maxAmount',
  'sort',
  'order',
  'pageSize',
] as const;

/** A hand-shared amount bound is only honoured when it is a real number. */
function parseAmount(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseFilters(params: URLSearchParams): PaymentsQueryParams {
  return {
    status: (params.get('status') ?? 'all') as PaymentsQueryParams['status'],
    type: (params.get('type') ?? 'all') as PaymentsQueryParams['type'],
    provider: (params.get('provider') ??
      'all') as PaymentsQueryParams['provider'],
    method: (params.get('method') ?? 'all') as PaymentsQueryParams['method'],
    dateField: (params.get('dateField') ??
      'created') as PaymentsQueryParams['dateField'],
    reconciled: (params.get('reconciled') ??
      'all') as PaymentsQueryParams['reconciled'],
    q: params.get('q') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    minAmount: parseAmount(params.get('minAmount')),
    maxAmount: parseAmount(params.get('maxAmount')),
    sort: (params.get('sort') ?? 'created_at') as PaymentsQueryParams['sort'],
    order: (params.get('order') ?? 'desc') as PaymentsQueryParams['order'],
    page: Math.max(1, Number(params.get('page')) || 1),
    pageSize: Math.min(100, Math.max(5, Number(params.get('pageSize')) || 25)),
  };
}

export function PaymentsClient({ isOwner = false }: { isOwner?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // View state lives in the URL so filtered views can be shared and bookmarked.
  const tabParam = searchParams.get('tab');
  const activeTab: 'payments' | 'refunds' | 'webhooks' =
    tabParam === 'refunds' || tabParam === 'webhooks' ? tabParam : 'payments';

  const rangeParam = searchParams.get('range');
  const rangePreset: RangePreset =
    rangeParam && (RANGE_PRESETS as readonly string[]).includes(rangeParam)
      ? (rangeParam as RangePreset)
      : 'this_month';
  const range = rangeToDates(rangePreset);

  const filters = parseFilters(searchParams);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Any filter change resets pagination, unless the page is being set.
    if (!('page' in updates)) params.delete('page');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  // A ticked row belongs to the page that listed it, so the selection is
  // keyed by the URL that produced those rows instead of being left behind by
  // a filter or page change — otherwise a bulk reconcile acts on stale ids.
  const viewKey = searchParams.toString();
  const [paymentSelection, setPaymentSelection] = useState<{
    key: string;
    ids: string[];
  }>({ key: '', ids: [] });
  const selectedPaymentIds =
    paymentSelection.key === viewKey ? paymentSelection.ids : [];

  const updatePaymentSelection = (next: (prev: string[]) => string[]) =>
    setPaymentSelection((prev) => ({
      key: viewKey,
      ids: next(prev.key === viewKey ? prev.ids : []),
    }));

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

  const summaryQuery = usePaymentsSummary(range.from, range.to);
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
  // Per-tab loading gates so switching tabs does not skeleton panels unrelated
  // to the pending query. The summary cards are always visible, so they still
  // wait on `summaryQuery`.
  const summaryLoading = summaryQuery.isPending;
  const paymentsLoading = paymentsQuery.isPending;
  const refundsLoading = refundsQuery.isPending;
  const webhooksLoading = webhooksQuery.isPending;
  const error = paymentsQuery.error
    ? paymentsQuery.error instanceof Error
      ? paymentsQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_PAYMENTS
    : null;
  const detailPayment = detailQuery.data ?? null;
  const detailError = detailQuery.isError
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_PAYMENTS
    : null;

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
    updatePaymentSelection((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (checked: boolean) => {
    updatePaymentSelection(() => (checked ? payments.map((p) => p.id) : []));
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
      updatePaymentSelection(() => []);
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
        loading={summaryLoading}
        selectedRange={rangePreset}
        onRangeShortcut={(preset) =>
          updateParams({ range: preset === 'this_month' ? undefined : preset })
        }
      />

      {/* Visual Volume Breakdown */}
      <PaymentsBreakdown breakdown={breakdown} loading={summaryLoading} />

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            updateParams({ tab: val === 'payments' ? undefined : val })
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
                <Badge variant="brand">{manualRefunds.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="flex items-center gap-1.5 pb-2 font-semibold"
            >
              Webhook Events
              {webhooks.some((w) => w.isOverdue) && (
                <Badge variant="destructive">!</Badge>
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
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            title="Download CSV of current filtered view (max 10,000 rows)"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="secondary"
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
            onChange={(patch) =>
              updateParams(
                Object.fromEntries(
                  Object.entries(patch).map(([key, val]) => [
                    key,
                    val === undefined || val === null ? undefined : String(val),
                  ]),
                ),
              )
            }
            onReset={() => {
              const params = new URLSearchParams(searchParams.toString());
              for (const key of FILTER_KEYS) params.delete(key);
              params.delete('page');
              const query = params.toString();
              router.replace(query ? `${pathname}?${query}` : pathname);
            }}
            resultCount={totalPayments}
          />

          {paymentsLoading ? (
            <AdminLoading label="Loading payments register..." />
          ) : error ? (
            <AdminError
              message={error}
              action={
                <Button
                  variant="secondary"
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-muted/30 px-4 py-3 text-caption text-muted-foreground">
                <span>
                  Showing {payments.length} of {totalPayments} payment record(s)
                </span>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          updateParams({
                            page: String(Math.max(1, (filters.page ?? 1) - 1)),
                          })
                        }
                        disabled={(filters.page ?? 1) <= 1}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-2 text-caption font-medium text-muted-foreground">
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
                          updateParams({
                            page: String((filters.page ?? 1) + 1),
                          })
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
          loading={refundsLoading}
          onMarkPaidOut={handleMarkRefundPaidOut}
          onRecheckProvider={handleRecheckProviderRefund}
        />
      )}

      {/* TAB 3: Webhook Events */}
      {activeTab === 'webhooks' && (
        <WebhooksTab
          events={webhooks}
          loading={webhooksLoading}
          onReprocess={handleReprocessWebhook}
          isOwner={isOwner}
        />
      )}

      {/* Detail Drawer */}
      {detailSelection && (
        <PaymentDetailDrawer
          isOpen
          payment={detailPayment}
          error={detailError}
          onRetry={() => void detailQuery.refetch()}
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
