'use client';

import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';

import { AdminError } from '@/components/admin/AdminStates';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button, ButtonLink } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useDashboardOccupancy,
  useDashboardRevenue,
  useDashboardSummary,
} from '@/hooks/admin/use-dashboard';
import type { AdminRole, Permission } from '@/types/auth.types';
import type { RevenueRange } from '@/types/dashboard.types';

import { ArrivalsTable } from './ArrivalsTable';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DeparturesTable } from './DeparturesTable';
import { KpiRow } from './KpiRow';
import { NeedsAttention } from './NeedsAttention';
import { NoRoomsState } from './NoRoomsState';
import { OccupancyStrip } from './OccupancyStrip';
import { RecentActivity } from './RecentActivity';
import { RevenueSummary } from './RevenueSummary';
import { StaleBanner } from './StaleBanner';

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
  const canManageReservations = permissions.includes('reservations.manage');
  const canViewRevenue = permissions.includes('revenue.view');

  const [revenueRange, setRevenueRange] = useState<RevenueRange>('7d');

  // 1. Fetch Summary (KPI, attention, arrivals, departures, activity)
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    isStale,
    liveAnnouncement,
    refresh: refreshSummary,
    setHovering,
    setData: setSummaryData,
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
      const { adminService } = await import('@/app/api/services/admin.service');
      const res = await adminService.checkInReservation(id);
      if (res.data?.row) {
        const updated = res.data.row;
        // In-place update of summary data
        setSummaryData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            arrivals: prev.arrivals.map((r) => (r.id === id ? updated : r)),
            kpi: {
              ...prev.kpi,
              inHouseTonight: prev.kpi.inHouseTonight + 1,
              occupiedRooms: Math.min(
                prev.kpi.sellableRooms,
                prev.kpi.occupiedRooms + 1,
              ),
              occupancyPercent:
                prev.kpi.sellableRooms > 0
                  ? Math.round(
                      (Math.min(
                        prev.kpi.sellableRooms,
                        prev.kpi.occupiedRooms + 1,
                      ) /
                        prev.kpi.sellableRooms) *
                        100,
                    )
                  : 0,
            },
          };
        });
        toast.add({
          title: SUCCESS_MESSAGES.GUEST_CHECKED_IN(updated.guestName),
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
      const { adminService } = await import('@/app/api/services/admin.service');
      const res = await adminService.checkOutReservation(id);
      if (res.data?.row) {
        const updated = res.data.row;
        // In-place update of departures list
        setSummaryData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            departures: prev.departures.map((r) => (r.id === id ? updated : r)),
            kpi: {
              ...prev.kpi,
              inHouseTonight: Math.max(0, prev.kpi.inHouseTonight - 1),
              occupiedRooms: Math.max(0, prev.kpi.occupiedRooms - 1),
              occupancyPercent:
                prev.kpi.sellableRooms > 0
                  ? Math.round(
                      (Math.max(0, prev.kpi.occupiedRooms - 1) /
                        prev.kpi.sellableRooms) *
                        100,
                    )
                  : 0,
            },
          };
        });
        toast.add({
          title: SUCCESS_MESSAGES.GUEST_CHECKED_OUT(updated.guestName),
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
              {/* 2. KPI row (4 cards) */}
              <KpiRow kpi={summary.kpi} />

              {/* 3. Needs attention panel */}
              <NeedsAttention items={summary.attention} />

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
                <div className="rounded-card border-line bg-card border p-6">
                  <div className="bg-line/80 h-5 w-40 animate-pulse rounded" />
                  <div className="bg-line/30 mt-6 h-32 animate-pulse rounded" />
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
                  onRangeChange={(range) => setRevenueRange(range)}
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
