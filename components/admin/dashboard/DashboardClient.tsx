'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lock, Plus } from 'lucide-react';

import { AdminError } from '@/components/admin/AdminStates';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button, ButtonLink } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCheckInReservation,
  useCheckOutReservation,
  useDashboardOccupancy,
  useDashboardRevenue,
  useDashboardSummary,
} from '@/hooks/services/admin/use-dashboard';
import type { AdminRole, Permission } from '@/types/auth.types';
import type { RevenueRange } from '@/types/dashboard.types';

import { ArrivalsTable } from './ArrivalsTable';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DeparturesTable } from './DeparturesTable';
import { KpiRow } from './KpiRow';
import { NoRoomsState } from './NoRoomsState';
import { OccupancyStrip } from './OccupancyStrip';
import { RecentActivity } from './RecentActivity';
import { REVENUE_RANGES, RevenueSummary } from './RevenueSummary';
import { StaleBanner } from './StaleBanner';
import { WorkQueue } from './WorkQueue';

interface DashboardClientProps {
  role: AdminRole;
  permissions: readonly Permission[];
  timezone: string;
  formattedToday: string;
}

export function DashboardClient({
  permissions,
  timezone,
  formattedToday,
}: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canManageReservations = permissions.includes('reservations.manage');
  const canViewRevenue = permissions.includes('revenue.view');

  const rangeParam = searchParams.get('range');
  const revenueRange: RevenueRange =
    rangeParam && REVENUE_RANGES.some((r) => r.id === rangeParam)
      ? (rangeParam as RevenueRange)
      : '7d';

  const selectRevenueRange = (range: RevenueRange) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range === '7d') params.delete('range');
    else params.set('range', range);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const checkInReservation = useCheckInReservation();
  const checkOutReservation = useCheckOutReservation();

  // 1. Fetch Summary (KPI, attention, arrivals, departures, activity)
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    isStale,
    liveAnnouncement,
    refresh: refreshSummary,
    setHovering,
  } = useDashboardSummary();

  // 2. Fetch Occupancy (14 days)
  const {
    data: occupancyData,
    isLoading: occupancyLoading,
    error: occupancyError,
    refresh: refreshOccupancy,
  } = useDashboardOccupancy(summary?.todayDate);

  // 3. Fetch Revenue (Permission-gated: only if canViewRevenue is true)
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
    refresh: refreshRevenue,
  } = useDashboardRevenue(revenueRange, canViewRevenue);

  // Row Quick Actions handlers
  async function handleCheckIn(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await checkInReservation.mutateAsync(id);
      if (result?.row) {
        toast.add({
          title: SUCCESS_MESSAGES.GUEST_CHECKED_IN(result.row.guestName),
          type: 'success',
        });
        return { success: true };
      }
      return { success: false, error: ERROR_MESSAGES.CHECKIN_RESPONSE_INVALID };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ERROR_MESSAGES.CHECKIN_FAILED;
      return { success: false, error: msg };
    }
  }

  async function handleCheckOut(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await checkOutReservation.mutateAsync(id);
      if (result?.row) {
        toast.add({
          title: SUCCESS_MESSAGES.GUEST_CHECKED_OUT(result.row.guestName),
          type: 'success',
        });
        return { success: true };
      }
      return {
        success: false,
        error: ERROR_MESSAGES.CHECKOUT_RESPONSE_INVALID,
      };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ERROR_MESSAGES.CHECKOUT_FAILED;
      return { success: false, error: msg };
    }
  }

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="space-y-6"
    >
      {/* Politely announced live updates for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title="Dashboard"
        description={`${formattedToday} • Hotel time (${timezone})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageReservations && (
              <ButtonLink
                href="/admin/reservations/new"
                variant="primary"
                size="sm"
                icon={<Plus className="size-4" aria-hidden="true" />}
              >
                New reservation
              </ButtonLink>
            )}
            <ButtonLink
              href="/admin/calendar"
              variant="secondary"
              size="sm"
              icon={<Lock className="size-4" aria-hidden="true" />}
            >
              Block dates
            </ButtonLink>
          </div>
        }
      />

      {/* Stale data warning */}
      {isStale && <StaleBanner onRefresh={refreshSummary} />}

      {/* Loading state */}
      {summaryLoading && !summary && <DashboardSkeleton />}

      {/* Error state for Summary */}
      {summaryError && !summary && (
        <AdminError
          message={summaryError}
          action={
            <Button variant="secondary" size="sm" onClick={refreshSummary}>
              Retry loading dashboard
            </Button>
          }
        />
      )}

      {/* Main dashboard content once summary is available */}
      {summary && (
        <>
          {!summary.hasRooms ? (
            <NoRoomsState />
          ) : (
            <>
              {/* 2. Today's work queue, with a deep link per item */}
              <WorkQueue
                attention={summary.attention}
                arrivals={summary.arrivals}
              />

              {/* 3. KPI row */}
              <KpiRow kpi={summary.kpi} />

              {/* 4. Today's arrivals and departures */}
              <div className="grid gap-6 lg:grid-cols-2">
                <ArrivalsTable
                  rows={summary.arrivals}
                  canManage={canManageReservations}
                  onCheckIn={handleCheckIn}
                />
                <DeparturesTable
                  rows={summary.departures}
                  canManage={canManageReservations}
                  onCheckOut={handleCheckOut}
                />
              </div>

              {/* 5. Next 14 days occupancy */}
              {occupancyLoading && !occupancyData ? (
                <div className="rounded-card border border-line bg-card p-6">
                  <div className="h-5 w-40 animate-pulse rounded-sm bg-line/80" />
                  <div className="mt-6 h-32 animate-pulse rounded-sm bg-line/30" />
                </div>
              ) : occupancyError && !occupancyData ? (
                <AdminError
                  message={ERROR_MESSAGES.FAILED_TO_LOAD_14_DAY_OCCUPANCY}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={refreshOccupancy}
                    >
                      Retry occupancy
                    </Button>
                  }
                />
              ) : occupancyData ? (
                <OccupancyStrip days={occupancyData.days} />
              ) : null}

              {/* 6. Revenue summary (Owner and Manager only) */}
              {canViewRevenue && (
                <RevenueSummary
                  data={revenueData?.revenue ?? null}
                  selectedRange={revenueRange}
                  isLoading={revenueLoading}
                  error={revenueError}
                  onRangeChange={selectRevenueRange}
                  onRetry={refreshRevenue}
                />
              )}

              {/* 7. Recent activity */}
              <RecentActivity events={summary.activity} />
            </>
          )}
        </>
      )}
    </div>
  );
}
