'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  DashboardOccupancyResponse,
  DashboardRevenueResponse,
  DashboardSummaryResponse,
  RevenueRange,
} from '@/types/dashboard.types';

interface SummaryCounts {
  arrivals: number;
  departures: number;
  inHouse: number;
  attention: number;
}

function summaryCounts(summary: DashboardSummaryResponse): SummaryCounts {
  return {
    arrivals: summary.kpi.arrivalsToday,
    departures: summary.kpi.departuresToday,
    inHouse: summary.kpi.inHouseTonight,
    attention: summary.attention.length,
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboardSummary(
  initialDate?: string,
  initialData?: DashboardSummaryResponse,
) {
  const queryClient = useQueryClient();
  const [hovering, setHovering] = useState(false);
  const isHoveredRef = useRef(false);
  const previousCountsRef = useRef<SummaryCounts | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const query = useQuery({
    queryKey: queryKeys.admin.dashboard.summary(initialDate),
    queryFn: async (): Promise<DashboardSummaryResponse> => {
      const response = await adminService.getDashboardSummary(initialDate);
      return response.data;
    },
    initialData,
    staleTime: 0,
    refetchInterval: () => (isHoveredRef.current || hovering ? false : 60_000),
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!query.data) return;

    const nextCounts = summaryCounts(query.data);
    const previousCounts = previousCountsRef.current;
    previousCountsRef.current = nextCounts;
    if (!previousCounts) return;

    const changes: string[] = [];
    if (previousCounts.arrivals !== nextCounts.arrivals) {
      changes.push(`Arrivals today updated to ${nextCounts.arrivals}`);
    }
    if (previousCounts.departures !== nextCounts.departures) {
      changes.push(`Departures today updated to ${nextCounts.departures}`);
    }
    if (previousCounts.inHouse !== nextCounts.inHouse) {
      changes.push(`In-house tonight updated to ${nextCounts.inHouse}`);
    }
    if (previousCounts.attention !== nextCounts.attention) {
      changes.push(`Attention items updated to ${nextCounts.attention}`);
    }
    if (changes.length === 0) return;

    const message = changes.join('. ');
    const timer = window.setTimeout(() => setLiveAnnouncement(message), 0);
    return () => window.clearTimeout(timer);
  }, [query.data]);

  useEffect(() => {
    const refetch = query.refetch;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [query.refetch]);

  const setHoveringValue = useCallback((value: boolean) => {
    isHoveredRef.current = value;
    setHovering(value);
  }, []);

  const setData = useCallback(
    (
      updater: (
        previous: DashboardSummaryResponse | undefined,
      ) => DashboardSummaryResponse | undefined,
    ) => {
      queryClient.setQueryData<DashboardSummaryResponse>(
        queryKeys.admin.dashboard.summary(initialDate),
        updater,
      );
    },
    [initialDate, queryClient],
  );

  return {
    data: query.data ?? null,
    isLoading: query.isPending && !query.data,
    error: query.error
      ? errorMessage(query.error, ERROR_MESSAGES.FAILED_TO_LOAD_SUMMARY)
      : null,
    isStale: query.isError && Boolean(query.data),
    liveAnnouncement,
    refresh: () => {
      void query.refetch();
    },
    setHovering: setHoveringValue,
    setData,
  };
}

export function useDashboardOccupancy(from?: string, days = 14) {
  const query = useQuery({
    queryKey: queryKeys.admin.dashboard.occupancy(from, days),
    queryFn: async (): Promise<DashboardOccupancyResponse> => {
      const response = await adminService.getDashboardOccupancy(from, days);
      return response.data;
    },
    staleTime: 0,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending && !query.data,
    error: query.error
      ? errorMessage(query.error, ERROR_MESSAGES.FAILED_TO_LOAD_OCCUPANCY_UI)
      : null,
    refresh: () => {
      void query.refetch();
    },
  };
}

export function useDashboardRevenue(range: RevenueRange, enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.admin.dashboard.revenue(range),
    queryFn: async (): Promise<DashboardRevenueResponse> => {
      const response = await adminService.getDashboardRevenue(range);
      return response.data;
    },
    enabled,
    staleTime: 0,
  });

  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending && !query.data,
    error:
      enabled && query.error
        ? errorMessage(query.error, ERROR_MESSAGES.FAILED_TO_LOAD_REVENUE_UI)
        : null,
    refresh: () => {
      if (!enabled) return;
      void query.refetch();
    },
  };
}

function updateSummaryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (previous: DashboardSummaryResponse) => DashboardSummaryResponse,
) {
  queryClient.setQueryData<DashboardSummaryResponse>(
    queryKeys.admin.dashboard.summary(),
    (previous) => (previous ? updater(previous) : previous),
  );
}

export function useCheckInReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.checkInReservation(id);
      return response.data;
    },
    onSuccess: (result, id) => {
      if (!result?.row) return;
      const updated = result.row;
      updateSummaryCache(queryClient, (previous) => ({
        ...previous,
        arrivals: previous.arrivals.map((row) =>
          row.id === id ? updated : row,
        ),
        kpi: {
          ...previous.kpi,
          inHouseTonight: previous.kpi.inHouseTonight + 1,
          occupiedRooms: Math.min(
            previous.kpi.sellableRooms,
            previous.kpi.occupiedRooms + 1,
          ),
          occupancyPercent:
            previous.kpi.sellableRooms > 0
              ? Math.round(
                  (Math.min(
                    previous.kpi.sellableRooms,
                    previous.kpi.occupiedRooms + 1,
                  ) /
                    previous.kpi.sellableRooms) *
                    100,
                )
              : 0,
        },
      }));
    },
  });
}

export function useCheckOutReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.checkOutReservation(id);
      return response.data;
    },
    onSuccess: (result, id) => {
      if (!result?.row) return;
      const updated = result.row;
      updateSummaryCache(queryClient, (previous) => ({
        ...previous,
        departures: previous.departures.map((row) =>
          row.id === id ? updated : row,
        ),
        kpi: {
          ...previous.kpi,
          inHouseTonight: Math.max(0, previous.kpi.inHouseTonight - 1),
          occupiedRooms: Math.max(0, previous.kpi.occupiedRooms - 1),
          occupancyPercent:
            previous.kpi.sellableRooms > 0
              ? Math.round(
                  (Math.max(0, previous.kpi.occupiedRooms - 1) /
                    previous.kpi.sellableRooms) *
                    100,
                )
              : 0,
        },
      }));
    },
  });
}
