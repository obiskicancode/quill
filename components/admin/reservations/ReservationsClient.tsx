'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { AdminEmpty, AdminError } from '@/components/admin/AdminStates';
import { StaleBanner } from '@/components/admin/dashboard/StaleBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useMarkReservationNoShow } from '@/hooks/services/admin/use-reservations';
import { useReservationsList } from '@/hooks/services/admin/use-reservations-data';
import { reservationsListQuerySchema } from '@/schemas/reservation.schema';
import type { AdminRole, Permission } from '@/types/auth.types';
import type {
  ReservationSortField,
  SortOrder,
} from '@/types/reservation.types';

import { ReservationsFilterBar } from './ReservationsFilterBar';
import { ReservationsMobileList } from './ReservationsMobileList';
import { ReservationsPagination } from './ReservationsPagination';
import { ReservationsSkeleton } from './ReservationsSkeleton';
import { ReservationsTable } from './ReservationsTable';

interface ReservationsClientProps {
  role: AdminRole;
  permissions: readonly Permission[];
}

/**
 * Reservations page coordinator: URL-backed filters, table/mobile list,
 * pagination and the action modals available to the current role.
 */
export function ReservationsClient({ permissions }: ReservationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canExportCsv = permissions.includes('payments.view');
  const canMarkNoShow = permissions.includes('reservations.no_show');

  const ask = useConfirm();
  const markNoShow = useMarkReservationNoShow();

  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection belongs to the rows of one query. Keying it by the query
  // string means a filter or page change invalidates it on its own.
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: '',
    ids: [],
  });

  const isInteractingRef = useRef(false);

  // Parse filters from URL, dropping any `filter` value not in the enum so the
  // API never sees a bad quick-filter. We remember the raw value to warn.
  const rawFilterParam = searchParams.get('filter');
  const parsedFilter = reservationsListQuerySchema.shape.filter.safeParse(
    rawFilterParam ?? undefined,
  );
  const invalidFilterRaw =
    rawFilterParam && !parsedFilter.success ? rawFilterParam : null;

  const sanitizedParams = new URLSearchParams(searchParams.toString());
  if (invalidFilterRaw) sanitizedParams.delete('filter');
  const currentParamsString = sanitizedParams.toString();

  const {
    data: reservationsData,
    error: reservationsError,
    isError,
    isPending,
    refetch,
  } = useReservationsList(currentParamsString, undefined, () =>
    // 60-second silent auto-refresh, paused while the admin is interacting.
    isInteractingRef.current ? false : 60_000,
  );

  const data = reservationsData ?? null;
  const isLoading = isPending;
  const error = reservationsError
    ? reservationsError instanceof Error
      ? reservationsError.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_RESERVATIONS_UI
    : null;
  const isStale = isError && Boolean(data);

  const selectedIds =
    selection.key === currentParamsString ? selection.ids : [];

  const updateSelection = (next: (prev: string[]) => string[]) =>
    setSelection((prev) => ({
      key: currentParamsString,
      ids: next(prev.key === currentParamsString ? prev.ids : []),
    }));

  // Update URL Search Params helper
  const updateUrlParams = (
    updates: Record<string, string | string[] | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.delete(key);
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, String(value));
      }
    });

    // Reset to page 1 whenever filters change (unless page itself is updated)
    if (!('page' in updates)) {
      params.delete('page');
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSortChange = (field: ReservationSortField, order: SortOrder) => {
    updateUrlParams({ sort: field, order });
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: String(newPage) });
  };

  const handlePageSizeChange = (newSize: number) => {
    updateUrlParams({ pageSize: String(newSize), page: '1' });
  };

  // A no-show only applies to confirmed bookings; the server still rejects a
  // row whose arrival date has not arrived yet.
  const noShowTargets = (data?.rows ?? []).filter(
    (row) => selectedIds.includes(row.id) && row.status === 'confirmed',
  );

  const handleToggleSelect = (id: string) => {
    updateSelection((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const rows = data?.rows ?? [];
    updateSelection(() => (checked ? rows.map((row) => row.id) : []));
  };

  const handleBulkNoShow = async () => {
    const skipped = selectedIds.length - noShowTargets.length;
    // The dialog can be retried after a partial failure, so progress is
    // tracked outside `run` and each attempt only touches unseen rows.
    const doneIds = new Set<string>();

    const confirmed = await ask({
      title: `Mark ${noShowTargets.length} ${noShowTargets.length === 1 ? 'reservation' : 'reservations'} as no-show?`,
      tone: 'danger',
      confirmLabel: 'Mark as no-show',
      description: (
        <>
          <p>
            Each booking is closed as a no-show and dropped from arrivals. No
            refunds are processed by this bulk action — open a reservation to
            refund a guest.
          </p>
          {skipped > 0 && (
            <p className="mt-2">
              {skipped} {skipped === 1 ? 'booking is' : 'bookings are'} in the
              selection but not confirmed, so they will be left alone.
            </p>
          )}
        </>
      ),
      run: async () => {
        const failures: string[] = [];
        for (const row of noShowTargets) {
          if (doneIds.has(row.id)) continue;
          try {
            await markNoShow.mutateAsync({
              id: row.id,
              body: {
                refundAmountMinor: 0,
                version: row.updatedAt,
                idempotencyKey: crypto.randomUUID(),
              },
            });
            doneIds.add(row.id);
          } catch (cause) {
            failures.push(
              `${row.reference}: ${
                cause instanceof Error
                  ? cause.message
                  : ERROR_MESSAGES.FAILED_TO_MARK_NO_SHOW_UI
              }`,
            );
          }
        }

        if (failures.length > 0) {
          const failedIds = new Set(
            noShowTargets
              .filter((row) => !doneIds.has(row.id))
              .map((row) => row.id),
          );
          updateSelection((prev) => prev.filter((id) => failedIds.has(id)));
          throw new Error(
            `${doneIds.size} of ${noShowTargets.length} marked. Still waiting: ${failures.join(
              ' · ',
            )}`,
          );
        }
      },
    });

    if (confirmed) {
      updateSelection(() => []);
      toast.add({
        title: `${noShowTargets.length} ${
          noShowTargets.length === 1 ? 'reservation' : 'reservations'
        } marked as no-show.`,
        type: 'success',
      });
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const exportUrl = `/api/admin/reservations/export?${currentParamsString}`;
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error(ERROR_MESSAGES.FAILED_TO_EXPORT_OR_RATE_LIMITED);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      toast.add({
        title:
          err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_EXPORT,
        type: 'error',
        priority: 'high',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const appliedStatus = searchParams.getAll('status');
  const appliedFilters = {
    q: searchParams.get('q') ?? undefined,
    status: appliedStatus.length > 0 ? appliedStatus : undefined,
    dateField: searchParams.get('dateField') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    roomTypeId: searchParams.get('roomTypeId') ?? undefined,
    roomId: searchParams.get('roomId') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    paymentState: searchParams.get('paymentState') ?? undefined,
    filter: parsedFilter.success ? parsedFilter.data : undefined,
  };

  const hasFilterActive = Boolean(
    appliedFilters.q ||
    (appliedFilters.status && appliedFilters.status.length > 0) ||
    appliedFilters.dateField ||
    appliedFilters.from ||
    appliedFilters.to ||
    appliedFilters.roomTypeId ||
    appliedFilters.roomId ||
    appliedFilters.source ||
    appliedFilters.paymentState ||
    appliedFilters.filter,
  );

  return (
    <div
      onMouseEnter={() => {
        isInteractingRef.current = true;
      }}
      onMouseLeave={() => {
        isInteractingRef.current = false;
      }}
      className="space-y-5"
    >
      {/* 1. Page Header */}
      <PageHeader
        title="Reservations"
        description={
          data
            ? `${data.total} total bookings across property inventory.`
            : 'Manage bookings, arrivals, and departures.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canExportCsv && (
              <Button
                variant="secondary"
                size="sm"
                loading={isExporting}
                disabled={isExporting}
                onClick={handleExportCsv}
                icon={<Download className="size-4" aria-hidden="true" />}
              >
                Export CSV
              </Button>
            )}

            {/* New Reservation Action */}
            <Link href="/admin/reservations/new">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="size-4" aria-hidden="true" />}
              >
                New reservation
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stale Data Warning Banner */}
      {isStale && <StaleBanner onRefresh={() => void refetch()} />}

      {/* Unknown Quick-Filter Notice */}
      {invalidFilterRaw && (
        <Alert variant="warning" size="panel" role="status">
          <AlertTitle>Unknown quick filter ignored</AlertTitle>
          <AlertDescription>
            The URL asked for <code>{invalidFilterRaw}</code>, which is not a
            supported quick filter, so results are shown without it. Pick one
            from the filter bar instead.
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Filter Bar */}
      <ReservationsFilterBar
        currentFilters={appliedFilters}
        options={data?.options ?? { roomTypes: [], rooms: [] }}
        onFilterChange={(newFilters) => updateUrlParams(newFilters)}
        rows={data?.rows}
        resultCount={data?.total}
      />

      {/* Bulk actions for the rows ticked on this page */}
      {canMarkNoShow && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-card px-4 py-3 shadow-raised">
          <p className="text-small font-semibold text-ink" aria-live="polite">
            {selectedIds.length} selected
          </p>
          {noShowTargets.length > 0 ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={markNoShow.isPending}
              disabled={markNoShow.isPending}
              onClick={() => void handleBulkNoShow()}
            >
              Mark {noShowTargets.length} as no-show
            </Button>
          ) : (
            <p className="text-caption text-muted-foreground">
              None of the selected bookings are confirmed, so there is nothing
              to mark as a no-show.
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => updateSelection(() => [])}
            className="ml-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* 3. Main Content: Loading, Error, Empty, or Table */}
      {isLoading && !data ? (
        <ReservationsSkeleton />
      ) : error && !data ? (
        <AdminError
          message={error}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          }
        />
      ) : data?.rows.length === 0 ? (
        hasFilterActive ? (
          <AdminEmpty title="No matching reservations found">
            <p>No bookings matched the selected filters and search query.</p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateUrlParams({
                    q: undefined,
                    status: undefined,
                    dateField: undefined,
                    from: undefined,
                    to: undefined,
                    roomTypeId: undefined,
                    roomId: undefined,
                    source: undefined,
                    paymentState: undefined,
                    filter: undefined,
                  })
                }
              >
                Clear all filters
              </Button>
            </div>
          </AdminEmpty>
        ) : (
          <AdminEmpty title="No reservations booked yet">
            <p>Your hotel has no reservations recorded yet.</p>
          </AdminEmpty>
        )
      ) : data ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <ReservationsTable
              rows={data.rows}
              sort={searchParams.get('sort') ?? 'check_in'}
              order={searchParams.get('order') ?? 'asc'}
              onSortChange={handleSortChange}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              canSelect={canMarkNoShow}
            />
          </div>

          {/* Mobile Card List View */}
          <ReservationsMobileList
            rows={data.rows}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            canSelect={canMarkNoShow}
          />

          {/* Pagination Controls */}
          <ReservationsPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      ) : null}
    </div>
  );
}
