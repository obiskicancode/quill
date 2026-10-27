'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, BedDouble, Loader2, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import type { AdminRole } from '@/types/auth.types';
import type {
  CalendarBlockBar,
  CalendarResponse,
} from '@/types/calendar.types';

import { BlockModal } from './BlockModal';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarDayPanel } from './CalendarDayPanel';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';

interface CalendarClientProps {
  initialData: CalendarResponse;
  role: AdminRole;
}

export function CalendarClient({ initialData, role }: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const fromParam = searchParams.get('from');
  const daysParam = searchParams.get('days');
  const roomTypeParam = searchParams.get('roomTypeId');
  const viewParam = searchParams.get('view');
  const dayParam = searchParams.get('day');

  const [from, setFrom] = useState(() =>
    fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
      ? fromParam
      : initialData.from,
  );
  const [days, setDays] = useState(() =>
    daysParam ? Number(daysParam) : initialData.days,
  );
  const [roomTypeId, setRoomTypeId] = useState<string | undefined>(
    () => roomTypeParam || undefined,
  );
  const [view, setView] = useState<'grid' | 'agenda'>(() =>
    viewParam === 'agenda' ? 'agenda' : 'grid',
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(() =>
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null,
  );

  // Calendar Data
  const [data, setData] = useState<CalendarResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block Modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CalendarBlockBar | null>(null);
  const [prefillBlock, setPrefillBlock] = useState<{
    roomId: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  // Sync state to URL search parameters
  const updateUrl = useCallback(
    (
      newFrom: string,
      newDays: number,
      newRt?: string,
      newView?: string,
      newDay?: string | null,
    ) => {
      const q = new URLSearchParams();
      if (newFrom !== initialData.today) q.set('from', newFrom);
      if (newDays !== 14) q.set('days', String(newDays));
      if (newRt) q.set('roomTypeId', newRt);
      if (newView && newView !== 'grid') q.set('view', newView);
      if (newDay) q.set('day', newDay);

      const str = q.toString();
      router.replace(`/admin/calendar${str ? `?${str}` : ''}`, {
        scroll: false,
      });
    },
    [router, initialData.today],
  );

  // Refresh when range parameters change
  useEffect(() => {
    let active = true;
    updateUrl(from, days, roomTypeId, view, selectedDay);

    const run = async () => {
      try {
        const res = await adminService.getCalendar({
          from,
          days,
          roomTypeId,
        });
        if (active) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to refresh calendar data.',
          );
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [from, days, roomTypeId, view, selectedDay, updateUrl]);

  // Silent 60-second auto-refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || blockModalOpen || selectedDay) return;
      try {
        const res = await adminService.getCalendar({ from, days, roomTypeId });
        setData(res.data);
      } catch {
        // Silent failure in background
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [from, days, roomTypeId, blockModalOpen, selectedDay]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCalendar({ from, days, roomTypeId });
      setData(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh calendar data.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Header Changes
  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
  };

  const handleRoomTypeChange = (newRt: string | undefined) => {
    setRoomTypeId(newRt);
  };

  const handleViewChange = (newView: 'grid' | 'agenda') => {
    setView(newView);
  };

  // Block Modal triggers
  const handleOpenNewBlock = () => {
    setBlockToEdit(null);
    setPrefillBlock(null);
    setBlockModalOpen(true);
  };

  const handleEditBlock = (block: CalendarBlockBar) => {
    setBlockToEdit(block);
    setPrefillBlock(null);
    setBlockModalOpen(true);
  };

  const handleStartBlockWithRange = (
    roomId: string,
    startDate: string,
    endDate: string,
  ) => {
    setBlockToEdit(null);
    setPrefillBlock({ roomId, startDate, endDate });
    setBlockModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <CalendarHeader
        from={from}
        days={days}
        today={data.today}
        roomTypeId={roomTypeId}
        roomTypes={data.roomTypes}
        view={view}
        onFromChange={handleFromChange}
        onDaysChange={handleDaysChange}
        onRoomTypeChange={handleRoomTypeChange}
        onViewChange={handleViewChange}
        onOpenBlockModal={handleOpenNewBlock}
      />

      {/* Main Content States */}
      {loading ? (
        <div className="rounded-card border-line bg-paper flex h-96 flex-col items-center justify-center border">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
          <p className="text-small text-muted-foreground mt-3">
            Loading calendar availability...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-card border-destructive/30 bg-paper flex h-96 flex-col items-center justify-center border p-6 text-center">
          <AlertCircle className="text-destructive size-10" />
          <h2 className="text-h4 text-ink mt-2 font-semibold">
            Failed to Load Calendar
          </h2>
          <p className="text-small text-muted-foreground mt-1 max-w-md">
            {error}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleManualRefresh}
            className="mt-4 flex items-center gap-1.5"
          >
            <RefreshCw className="size-4" />
            <span>Retry</span>
          </Button>
        </div>
      ) : data.rooms.length === 0 ? (
        <div className="rounded-card border-line bg-paper flex h-96 flex-col items-center justify-center border p-6 text-center">
          <BedDouble className="text-muted-foreground size-10" />
          <h2 className="text-h4 text-ink mt-2 font-semibold">
            No Rooms Configured
          </h2>
          <p className="text-small text-muted-foreground mt-1 max-w-md">
            There are no rooms found in the property inventory matching this
            filter.
          </p>
          <Link
            href="/admin/rooms"
            className="rounded-control bg-ink text-small text-paper mt-4 inline-flex items-center gap-1.5 px-4 py-2 font-semibold hover:opacity-90 focus:outline-hidden"
          >
            Manage Rooms & Room Types
          </Link>
        </div>
      ) : view === 'grid' ? (
        <CalendarGrid
          data={data}
          today={data.today}
          onSelectDate={(d) => setSelectedDay(d)}
          onEditBlock={handleEditBlock}
          onStartBlockWithRange={handleStartBlockWithRange}
        />
      ) : (
        <CalendarAgendaView
          data={data}
          today={data.today}
          onSelectDate={(d) => setSelectedDay(d)}
        />
      )}

      {/* Day Details Drawer/Panel */}
      {selectedDay && (
        <CalendarDayPanel
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Block Create/Edit Modal */}
      {blockModalOpen && (
        <BlockModal
          isOpen={blockModalOpen}
          onClose={() => {
            setBlockModalOpen(false);
            setBlockToEdit(null);
            setPrefillBlock(null);
          }}
          onSuccess={handleManualRefresh}
          role={role}
          today={data.today}
          rooms={data.rooms}
          roomTypes={data.roomTypes}
          blockToEdit={blockToEdit}
          initialRoomId={prefillBlock?.roomId}
          initialStartDate={prefillBlock?.startDate}
          initialEndDate={prefillBlock?.endDate}
        />
      )}
    </div>
  );
}
