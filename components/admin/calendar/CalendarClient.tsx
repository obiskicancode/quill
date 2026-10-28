'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, BedDouble, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useCalendarRange } from '@/hooks/services/admin/use-calendar';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const fromParam = searchParams.get('from');
  const daysParam = searchParams.get('days');
  const roomTypeParam = searchParams.get('roomTypeId');
  const viewParam = searchParams.get('view');
  const dayParam = searchParams.get('day');
  const parsedDays = daysParam ? Number(daysParam) : NaN;

  // Block Modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CalendarBlockBar | null>(null);
  const [prefillBlock, setPrefillBlock] = useState<{
    roomId: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const from =
    fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
      ? fromParam
      : initialData.from;
  const days =
    Number.isInteger(parsedDays) && parsedDays > 0 && parsedDays <= 90
      ? parsedDays
      : initialData.days;
  const roomTypeId = initialData.roomTypes.some((rt) => rt.id === roomTypeParam)
    ? (roomTypeParam ?? undefined)
    : undefined;
  const view: 'grid' | 'agenda' = viewParam === 'agenda' ? 'agenda' : 'grid';
  const selectedDay =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null;

  // Sync state to URL search parameters
  const updateUrl = useCallback(
    (patch: {
      from?: string;
      days?: number;
      roomTypeId?: string;
      view?: 'grid' | 'agenda';
      day?: string | null;
    }) => {
      const nextFrom = patch.from ?? from;
      const nextDays = patch.days ?? days;
      const nextRoomTypeId =
        'roomTypeId' in patch ? patch.roomTypeId : roomTypeId;
      const nextView = patch.view ?? view;
      const nextDay = 'day' in patch ? patch.day : selectedDay;

      const q = new URLSearchParams();
      if (nextFrom !== initialData.today) q.set('from', nextFrom);
      if (nextDays !== 14) q.set('days', String(nextDays));
      if (nextRoomTypeId) q.set('roomTypeId', nextRoomTypeId);
      if (nextView !== 'grid') q.set('view', nextView);
      if (nextDay) q.set('day', nextDay);

      const str = q.toString();
      router.replace(str ? `${pathname}?${str}` : pathname, {
        scroll: false,
      });
    },
    [
      days,
      from,
      initialData.today,
      pathname,
      roomTypeId,
      router,
      selectedDay,
      view,
    ],
  );

  const calendarQuery = useCalendarRange(
    { from, days, roomTypeId },
    {
      initialData,
      poll: !blockModalOpen && !selectedDay,
    },
  );
  const [refreshing, setRefreshing] = useState(false);

  const data = calendarQuery.data ?? initialData;
  const loading =
    refreshing || (calendarQuery.isPending && !calendarQuery.data);
  const error = calendarQuery.error
    ? calendarQuery.error instanceof Error
      ? calendarQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_REFRESH_CALENDAR
    : null;

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await calendarQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Header Changes
  const handleFromChange = (newFrom: string) => {
    updateUrl({ from: newFrom });
  };

  const handleDaysChange = (newDays: number) => {
    updateUrl({ days: newDays });
  };

  const handleRoomTypeChange = (newRt: string | undefined) => {
    updateUrl({ roomTypeId: newRt });
  };

  const handleViewChange = (newView: 'grid' | 'agenda') => {
    updateUrl({ view: newView });
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
          onSelectDate={(d) => updateUrl({ day: d })}
          onEditBlock={handleEditBlock}
          onStartBlockWithRange={handleStartBlockWithRange}
        />
      ) : (
        <CalendarAgendaView
          data={data}
          today={data.today}
          onSelectDate={(d) => updateUrl({ day: d })}
        />
      )}

      {/* Day Details Drawer/Panel */}
      {selectedDay && (
        <CalendarDayPanel
          date={selectedDay}
          onClose={() => updateUrl({ day: null })}
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
