'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminEmpty, AdminError } from '@/components/admin/AdminStates';
import { StaleBanner } from '@/components/admin/dashboard/StaleBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import type { AdminRole, Permission } from '@/lib/auth/permissions';
import type {
  ReservationsListResponse,
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

export function ReservationsClient({ permissions }: ReservationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canExportCsv = permissions.includes('payments.view');

  const [data, setData] = useState<ReservationsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isInteractingRef = useRef(false);

  // Parse filters from URL
  const currentParamsString = searchParams.toString();

  const fetchReservations = useCallback(
    async (isQuiet = false) => {
      if (!isQuiet) setIsLoading(true);
      try {
        const { adminService } =
          await import('@/app/api/services/admin.service');
        const res = await adminService.getReservationsList(currentParamsString);
        if (res.data) {
          setData(res.data);
          setError(null);
          setIsStale(false);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to load reservations';
        if (data) {
          setIsStale(true);
        } else {
          setError(msg);
        }
      } finally {
        if (!isQuiet) setIsLoading(false);
      }
    },
    [currentParamsString, data],
  );

  // Refetch when searchParams change
  useEffect(() => {
    let isMounted = true;

    import('@/app/api/services/admin.service').then(({ adminService }) => {
      adminService
        .getReservationsList(currentParamsString)
        .then((res) => {
          if (!isMounted || !res.data) return;
          setData(res.data);
          setError(null);
          setIsStale(false);
        })
        .catch((err: unknown) => {
          if (!isMounted) return;
          setError(
            err instanceof Error ? err.message : 'Failed to load reservations',
          );
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    });

    return () => {
      isMounted = false;
    };
  }, [currentParamsString]);

  // 60-second silent auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      if (isInteractingRef.current) {
        return;
      }
      fetchReservations(true);
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchReservations(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchReservations]);

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

    router.replace(`${pathname}?${params.toString()}`);
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

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const exportUrl = `/api/admin/reservations/export?${currentParamsString}`;
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error('Export failed or rate limited');
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
      alert(
        err instanceof Error ? err.message : 'Export failed. Please try again.',
      );
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
    filter: searchParams.get('filter') ?? undefined,
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
      {isStale && <StaleBanner onRefresh={() => fetchReservations(false)} />}

      {/* 2. Filter Bar */}
      <ReservationsFilterBar
        currentFilters={appliedFilters}
        options={data?.options ?? { roomTypes: [], rooms: [] }}
        onFilterChange={(newFilters) => updateUrlParams(newFilters)}
        rows={data?.rows}
      />

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
              onClick={() => fetchReservations(false)}
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
            />
          </div>

          {/* Mobile Card List View */}
          <ReservationsMobileList rows={data.rows} />

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
