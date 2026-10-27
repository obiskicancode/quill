'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type {
  DashboardOccupancyResponse,
  DashboardRevenueResponse,
  DashboardSummaryResponse,
  RevenueRange,
} from '@/types/dashboard.types';

export function useDashboardSummary(initialDate?: string) {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const isHoveredRef = useRef(false);
  const previousCountsRef = useRef<{
    arrivals: number;
    departures: number;
    inHouse: number;
    attention: number;
  } | null>(null);

  // Initial and param change fetch
  useEffect(() => {
    let isMounted = true;

    adminService
      .getDashboardSummary(initialDate)
      .then((res) => {
        if (!isMounted || !res.data) return;
        setData(res.data);
        setError(null);
        setIsStale(false);

        const newCounts = {
          arrivals: res.data.kpi.arrivalsToday,
          departures: res.data.kpi.departuresToday,
          inHouse: res.data.kpi.inHouseTonight,
          attention: res.data.attention.length,
        };

        if (previousCountsRef.current) {
          const changes: string[] = [];
          if (previousCountsRef.current.arrivals !== newCounts.arrivals) {
            changes.push(`Arrivals today updated to ${newCounts.arrivals}`);
          }
          if (previousCountsRef.current.departures !== newCounts.departures) {
            changes.push(`Departures today updated to ${newCounts.departures}`);
          }
          if (previousCountsRef.current.inHouse !== newCounts.inHouse) {
            changes.push(`In-house tonight updated to ${newCounts.inHouse}`);
          }
          if (previousCountsRef.current.attention !== newCounts.attention) {
            changes.push(`Attention items updated to ${newCounts.attention}`);
          }
          if (changes.length > 0) {
            setLiveAnnouncement(changes.join('. '));
          }
        }
        previousCountsRef.current = newCounts;
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_SUMMARY;
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialDate]);

  // Background refetch helper (used by auto-refresh and manual refresh)
  const refetch = useCallback(
    async (isQuiet = false) => {
      if (!isQuiet) setIsLoading(true);
      try {
        const res = await adminService.getDashboardSummary(initialDate);
        if (res.data) {
          setData(res.data);
          setError(null);
          setIsStale(false);

          const newCounts = {
            arrivals: res.data.kpi.arrivalsToday,
            departures: res.data.kpi.departuresToday,
            inHouse: res.data.kpi.inHouseTonight,
            attention: res.data.attention.length,
          };

          if (previousCountsRef.current) {
            const changes: string[] = [];
            if (previousCountsRef.current.arrivals !== newCounts.arrivals) {
              changes.push(`Arrivals today updated to ${newCounts.arrivals}`);
            }
            if (previousCountsRef.current.departures !== newCounts.departures) {
              changes.push(
                `Departures today updated to ${newCounts.departures}`,
              );
            }
            if (previousCountsRef.current.inHouse !== newCounts.inHouse) {
              changes.push(`In-house tonight updated to ${newCounts.inHouse}`);
            }
            if (previousCountsRef.current.attention !== newCounts.attention) {
              changes.push(`Attention items updated to ${newCounts.attention}`);
            }
            if (changes.length > 0) {
              setLiveAnnouncement(changes.join('. '));
            }
          }
          previousCountsRef.current = newCounts;
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_SUMMARY;
        if (data) {
          setIsStale(true);
        } else {
          setError(msg);
        }
      } finally {
        if (!isQuiet) setIsLoading(false);
      }
    },
    [initialDate, data],
  );

  // 60-second auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      if (isHoveredRef.current) {
        return;
      }
      refetch(true);
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const setHovering = useCallback((hovering: boolean) => {
    isHoveredRef.current = hovering;
  }, []);

  return {
    data,
    isLoading,
    error,
    isStale,
    liveAnnouncement,
    refresh: () => refetch(false),
    setHovering,
    setData,
  };
}

export function useDashboardOccupancy(from?: string, days = 14) {
  const [data, setData] = useState<DashboardOccupancyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    adminService
      .getDashboardOccupancy(from, days)
      .then((res) => {
        if (!isMounted || !res.data) return;
        setData(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_OCCUPANCY_UI;
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [from, days]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getDashboardOccupancy(from, days);
      if (res.data) {
        setData(res.data);
        setError(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_LOAD_OCCUPANCY_UI;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [from, days]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export function useDashboardRevenue(range: RevenueRange, enabled: boolean) {
  const [data, setData] = useState<DashboardRevenueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;

    adminService
      .getDashboardRevenue(range)
      .then((res) => {
        if (!isMounted || !res.data) return;
        setData(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_REVENUE_UI;
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range, enabled]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const res = await adminService.getDashboardRevenue(range);
      if (res.data) {
        setData(res.data);
        setError(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_LOAD_REVENUE_UI;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [range, enabled]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
