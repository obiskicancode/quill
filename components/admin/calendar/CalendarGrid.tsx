'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { addDays, formatShort, nightsBetween } from '@/lib/dates';
import type {
  CalendarBlockBar,
  CalendarResponse,
  CalendarRoom,
} from '@/types/calendar.types';

import { CalendarSummaryRow } from './CalendarSummaryRow';

interface CalendarGridProps {
  data: CalendarResponse;
  today: string;
  onSelectDate: (date: string) => void;
  onEditBlock: (block: CalendarBlockBar) => void;
  onStartBlockWithRange: (
    roomId: string,
    startDate: string,
    endDate: string,
  ) => void;
}

export function CalendarGrid({
  data,
  today,
  onSelectDate,
  onEditBlock,
  onStartBlockWithRange,
}: CalendarGridProps) {
  // Collapsible groups stored in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('dela_calendar_collapsed');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('dela_calendar_collapsed', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Range selection state
  // startCell: { roomId: string; date: string } | null
  const [selectionStart, setSelectionStart] = useState<{
    roomId: string;
    date: string;
  } | null>(null);
  const [activeSelection, setActiveSelection] = useState<{
    roomId: string;
    checkIn: string;
    checkOut: string;
    hasConflict: boolean;
    conflictReason?: string;
  } | null>(null);

  // Escape key cancels selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectionStart(null);
        setActiveSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute all dates in range
  const dates: string[] = [];
  for (let i = 0; i < data.days; i++) {
    dates.push(addDays(data.from, i));
  }

  // Handle cell click
  const handleCellClick = (room: CalendarRoom, date: string) => {
    if (room.status !== 'active') return;

    // Check if clicked cell is occupied by a reservation or block
    const isOccupied = data.reservations.some(
      (r) =>
        !r.isStaleHold &&
        r.roomId === room.id &&
        r.checkIn <= date &&
        r.checkOut > date,
    );
    const isBlocked = data.blocks.some(
      (b) => b.roomId === room.id && b.startDate <= date && b.endDate > date,
    );

    if (isOccupied || isBlocked) return;

    if (!selectionStart || selectionStart.roomId !== room.id) {
      // Start selection
      setSelectionStart({ roomId: room.id, date });
      setActiveSelection(null);
    } else {
      // End selection
      const [start, endExclusive] =
        selectionStart.date <= date
          ? [selectionStart.date, addDays(date, 1)]
          : [date, addDays(selectionStart.date, 1)];

      // Check if range crosses an occupied night
      let hasConflict = false;
      let conflictReason = '';

      const crossingRes = data.reservations.find(
        (r) =>
          !r.isStaleHold &&
          r.roomId === room.id &&
          r.checkIn < endExclusive &&
          r.checkOut > start,
      );

      const crossingBlock = data.blocks.find(
        (b) =>
          b.roomId === room.id &&
          b.startDate < endExclusive &&
          b.endDate > start,
      );

      if (crossingRes) {
        hasConflict = true;
        conflictReason = `Selection overlaps reservation ${crossingRes.reference} (${crossingRes.guestName})`;
      } else if (crossingBlock) {
        hasConflict = true;
        conflictReason = `Selection overlaps ${crossingBlock.reason} block`;
      }

      setActiveSelection({
        roomId: room.id,
        checkIn: start,
        checkOut: endExclusive,
        hasConflict,
        conflictReason,
      });
      setSelectionStart(null);
    }
  };

  const getDayOfWeek = (isoDate: string) => {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isWeekend = (isoDate: string) => {
    const d = new Date(isoDate + 'T00:00:00');
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isMonthBoundary = (isoDate: string) => {
    return isoDate.endsWith('-01');
  };

  // Group rooms by room type
  const roomsByType = data.roomTypes.map((rt) => ({
    ...rt,
    rooms: data.rooms.filter((r) => r.roomTypeId === rt.id),
  }));

  return (
    <div className="rounded-card border-line bg-paper relative flex flex-col border shadow-xs">
      {/* Horizontal Scrolling Grid Container */}
      <div className="relative max-h-[75vh] overflow-auto">
        <div className="min-w-fit">
          {/* Header Row: Dates */}
          <div className="bg-canvas border-line sticky top-0 z-30 flex border-b">
            {/* Corner Cell: Sticky top and left */}
            <div className="bg-canvas border-line sticky left-0 z-40 flex w-48 shrink-0 items-center justify-between border-r px-3 py-2 shadow-xs">
              <span className="text-small text-ink font-serif font-semibold">
                Rooms
              </span>
              <span className="text-caption text-muted font-mono">
                {data.rooms.length} units
              </span>
            </div>

            {/* Date Columns */}
            <div className="flex">
              {dates.map((date) => {
                const isToday = date === today;
                const weekend = isWeekend(date);
                const monthBoundary = isMonthBoundary(date);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onSelectDate(date)}
                    title={`Click to view breakdown for ${date}`}
                    aria-label={`View daily breakdown for ${date}`}
                    className={`border-line/60 hover:bg-paper flex w-24 shrink-0 flex-col items-center justify-center border-r py-2 transition-colors focus:outline-hidden ${
                      isToday
                        ? 'bg-amber-100/60 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                        : weekend
                          ? 'bg-canvas/90 text-ink'
                          : 'bg-canvas text-ink'
                    } ${monthBoundary ? 'border-l-ink/40 border-l-2' : ''}`}
                  >
                    <span className="text-muted text-[11px] font-medium tracking-wider uppercase">
                      {getDayOfWeek(date)}
                    </span>
                    <span className="text-small font-mono font-semibold">
                      {date.slice(8)}
                    </span>
                    {isToday && (
                      <span className="rounded-control text-paper mt-0.5 bg-amber-600 px-1 text-[9px] font-bold">
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Row */}
          <CalendarSummaryRow
            stats={data.stats}
            today={today}
            onSelectDate={onSelectDate}
          />

          {/* Room Rows by Room Type */}
          <div className="divide-line/60 divide-y">
            {roomsByType.map((group) => {
              const isCollapsed = !!collapsedGroups[group.id];

              return (
                <div key={group.id} className="divide-line/40 divide-y">
                  {/* Collapsible Room Type Header */}
                  <div className="bg-canvas/80 border-line text-small sticky left-0 flex w-full border-y font-medium">
                    {/* Left Sticky Label with Accordion Button */}
                    <div className="bg-canvas/95 border-line sticky left-0 z-20 flex w-48 shrink-0 items-center justify-between border-r px-3 py-1.5 shadow-xs">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="text-ink hover:text-ink/80 flex items-center gap-1.5 font-semibold focus:outline-hidden"
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="text-muted size-4" />
                        ) : (
                          <ChevronDown className="text-muted size-4" />
                        )}
                        <span>{group.name}</span>
                      </button>
                      <span className="text-caption text-muted font-mono">
                        ({group.rooms.length})
                      </span>
                    </div>

                    {/* Free Units Across Dates (Visible when collapsed or expanded) */}
                    <div className="flex">
                      {dates.map((date) => {
                        const stat = data.stats.find((s) => s.date === date);
                        const freeCount = stat?.freeByType[group.id]?.free ?? 0;
                        const totalCount =
                          stat?.freeByType[group.id]?.total ??
                          group.rooms.length;

                        return (
                          <div
                            key={date}
                            className="border-line/40 flex w-24 shrink-0 items-center justify-center border-r px-1 py-1 font-mono text-[11px]"
                          >
                            <span
                              className={`py-0.2 rounded-control px-1 ${
                                freeCount === 0
                                  ? 'bg-danger/10 text-danger font-semibold'
                                  : 'text-muted'
                              }`}
                            >
                              {freeCount}/{totalCount} free
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Room Rows (Rendered when expanded) */}
                  {!isCollapsed &&
                    group.rooms.map((room) => {
                      const isOutOfService =
                        room.status === 'maintenance' ||
                        room.status === 'inactive';

                      return (
                        <div
                          key={room.id}
                          className="hover:bg-canvas/20 relative flex h-14 items-center transition-colors"
                        >
                          {/* Sticky Room Column */}
                          <div className="border-line bg-paper sticky left-0 z-20 flex h-full w-48 shrink-0 items-center justify-between border-r px-3 shadow-xs">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-small text-ink font-mono font-semibold">
                                  #{room.roomNumber}
                                </span>
                                {room.floor !== null && (
                                  <span className="text-caption text-muted">
                                    • F{room.floor}
                                  </span>
                                )}
                              </div>
                              <span className="text-muted text-[11px]">
                                {room.roomTypeName}
                              </span>
                            </div>

                            {isOutOfService && (
                              <span className="rounded-control bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Out of Service
                              </span>
                            )}
                          </div>

                          {/* Date Cells / Slots */}
                          <div className="relative flex h-full">
                            {dates.map((date) => {
                              const isToday = date === today;
                              const weekend = isWeekend(date);
                              const isSelectingThisRoom =
                                selectionStart?.roomId === room.id;
                              const isStartCell =
                                isSelectingThisRoom &&
                                selectionStart.date === date;

                              return (
                                <button
                                  key={date}
                                  type="button"
                                  onClick={() => handleCellClick(room, date)}
                                  disabled={isOutOfService}
                                  aria-label={`Room ${room.roomNumber}, ${formatShort(date)}`}
                                  className={`border-line/40 relative flex h-full w-24 shrink-0 items-center justify-center border-r transition-colors focus:outline-hidden ${
                                    isOutOfService
                                      ? 'bg-stripes-muted cursor-not-allowed opacity-60'
                                      : isStartCell
                                        ? 'bg-ink/10 ring-ink ring-2 ring-inset'
                                        : isToday
                                          ? 'bg-amber-50/25 dark:bg-amber-950/10'
                                          : weekend
                                            ? 'bg-canvas/30'
                                            : 'bg-paper'
                                  }`}
                                />
                              );
                            })}

                            {/* Render Reservation Bars on this room */}
                            {data.reservations
                              .filter(
                                (r) => r.roomId === room.id && !r.isStaleHold,
                              )
                              .map((res) => {
                                // Calculate position in grid
                                const startIndex = dates.indexOf(res.checkIn);
                                const endIndex = dates.indexOf(res.checkOut);

                                // If reservation is completely outside visible range, skip
                                if (
                                  res.checkOut <= dates[0] ||
                                  res.checkIn >=
                                    addDays(dates[dates.length - 1], 1)
                                ) {
                                  return null;
                                }

                                const visibleStart = Math.max(
                                  0,
                                  startIndex >= 0 ? startIndex : 0,
                                );
                                const visibleEnd =
                                  endIndex >= 0
                                    ? endIndex
                                    : startIndex >= 0
                                      ? dates.length
                                      : dates.length;

                                const spanNights = Math.max(
                                  1,
                                  visibleEnd - visibleStart,
                                );
                                const leftPx = visibleStart * 96; // 96px = 24rem width per date
                                const widthPx = spanNights * 96 - 4; // 4px margin for turnover gap!

                                // Visual style cues by status
                                let barBg = 'bg-emerald-600 text-white';
                                if (res.status === 'pending') {
                                  barBg =
                                    'bg-amber-500 text-ink border border-amber-600';
                                } else if (res.status === 'checked_in') {
                                  barBg = 'bg-indigo-600 text-white';
                                } else if (res.status === 'checked_out') {
                                  barBg = 'bg-slate-500 text-white opacity-80';
                                }

                                return (
                                  <Link
                                    key={res.id}
                                    href={`/admin/reservations/${res.id}`}
                                    title={`${res.guestName} (${res.reference}) • ${formatShort(res.checkIn)} → ${formatShort(res.checkOut)} • Status: ${res.status}`}
                                    style={{
                                      left: `${leftPx + 2}px`,
                                      width: `${widthPx}px`,
                                    }}
                                    className={`rounded-control absolute top-2 z-10 flex h-10 items-center justify-between px-2 shadow-xs transition-transform hover:scale-[1.01] focus:outline-hidden ${barBg}`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <span className="text-caption truncate font-semibold">
                                        {res.guestName}
                                      </span>
                                      <span className="shrink-0 font-mono text-[10px] opacity-80">
                                        ({res.reference})
                                      </span>
                                    </div>

                                    {/* Hold expiration warning for pending */}
                                    {res.status === 'pending' && (
                                      <span className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-bold">
                                        <Clock className="size-3" />
                                        <span>Held</span>
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}

                            {/* Render Block Bars on this room */}
                            {data.blocks
                              .filter((b) => b.roomId === room.id)
                              .map((block) => {
                                const startIndex = dates.indexOf(
                                  block.startDate,
                                );
                                const endIndex = dates.indexOf(block.endDate);

                                if (
                                  block.endDate <= dates[0] ||
                                  block.startDate >=
                                    addDays(dates[dates.length - 1], 1)
                                ) {
                                  return null;
                                }

                                const visibleStart = Math.max(
                                  0,
                                  startIndex >= 0 ? startIndex : 0,
                                );
                                const visibleEnd =
                                  endIndex >= 0
                                    ? endIndex
                                    : startIndex >= 0
                                      ? dates.length
                                      : dates.length;

                                const spanNights = Math.max(
                                  1,
                                  visibleEnd - visibleStart,
                                );
                                const leftPx = visibleStart * 96;
                                const widthPx = spanNights * 96 - 4;

                                return (
                                  <button
                                    key={block.id}
                                    type="button"
                                    onClick={() => onEditBlock(block)}
                                    title={`Blocked: ${block.reason.replace('_', ' ')} (${formatShort(block.startDate)} → ${formatShort(block.endDate)}). ${block.notes || ''} Click to edit.`}
                                    style={{
                                      left: `${leftPx + 2}px`,
                                      width: `${widthPx}px`,
                                    }}
                                    className="rounded-control border-danger/40 bg-danger/15 text-danger hover:bg-danger/25 absolute top-2 z-10 flex h-10 items-center justify-between border px-2 shadow-xs transition-colors focus:outline-hidden"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <ShieldAlert className="size-3.5 shrink-0" />
                                      <span className="text-caption truncate font-semibold uppercase">
                                        {block.reason.replace('_', ' ')}
                                      </span>
                                      {block.notes && (
                                        <span className="text-muted truncate text-[11px]">
                                          - {block.notes}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Range Selection Action Popover */}
      {activeSelection && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-card border-ink bg-ink text-paper sticky bottom-4 z-40 mx-auto flex w-full max-w-lg items-center justify-between border p-3.5 shadow-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-small font-semibold">
                {nightsBetween(
                  activeSelection.checkIn,
                  activeSelection.checkOut,
                )}{' '}
                Night(s) Selected
              </span>
              <span className="text-caption text-paper/70 font-mono">
                ({formatShort(activeSelection.checkIn)} →{' '}
                {formatShort(activeSelection.checkOut)})
              </span>
            </div>
            {activeSelection.hasConflict ? (
              <p className="text-caption mt-0.5 text-red-300">
                {activeSelection.conflictReason}
              </p>
            ) : (
              <p className="text-caption text-paper/70 mt-0.5">
                Choose an action to proceed with this room and date range:
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!activeSelection.hasConflict && (
              <>
                <Link
                  href={`/admin/reservations/new?roomId=${encodeURIComponent(
                    activeSelection.roomId,
                  )}&checkIn=${encodeURIComponent(
                    activeSelection.checkIn,
                  )}&checkOut=${encodeURIComponent(activeSelection.checkOut)}`}
                  className="rounded-control bg-paper text-small text-ink px-3 py-1.5 font-semibold transition-opacity hover:opacity-90 focus:outline-hidden"
                >
                  New Reservation
                </Link>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onStartBlockWithRange(
                      activeSelection.roomId,
                      activeSelection.checkIn,
                      activeSelection.checkOut,
                    );
                    setActiveSelection(null);
                  }}
                  className="text-small"
                >
                  Block Dates
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveSelection(null)}
              aria-label="Dismiss selection"
              className="rounded-control text-paper/70 hover:text-paper p-1 hover:bg-white/10 focus:outline-hidden"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid Legend at Bottom */}
      <div className="bg-canvas/40 border-line text-caption text-muted flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink font-semibold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-emerald-600" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-indigo-600" />
            <span>Checked In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-amber-500" />
            <span>Pending Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-slate-500" />
            <span>Checked Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="border-danger/50 bg-danger/20 size-3 rounded-xs border" />
            <span>Room Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-stripes-muted border-line size-3 rounded-xs border" />
            <span>Out of Service</span>
          </div>
        </div>

        <div className="text-muted font-mono text-[11px]">
          Turnover: Adjacent bars separated by turnover divider • Check-out day
          is free for check-in
        </div>
      </div>
    </div>
  );
}
