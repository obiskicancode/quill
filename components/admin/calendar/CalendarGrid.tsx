'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWebStorage } from '@/hooks/use-web-storage';
import {
  addDays,
  formatShort,
  formatWeekday,
  nightsBetween,
} from '@/lib/dates';
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
  const [collapsedGroups, setCollapsedGroups] = useWebStorage<
    Record<string, boolean>
  >('localStorage', 'dela_calendar_collapsed', {});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
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

  const getDayOfWeek = (isoDate: string) => formatWeekday(isoDate);

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
    <TooltipProvider delay={150}>
      <div className="relative flex flex-col rounded-card border border-line bg-paper shadow-xs">
        {/* Horizontal Scrolling Grid Container */}
        <div className="relative max-h-[75vh] overflow-auto">
          <div className="min-w-fit">
            {/* Header Row: Dates */}
            <div className="sticky top-0 z-30 flex border-b border-line bg-muted">
              {/* Corner Cell: Sticky top and left */}
              <div className="sticky left-0 z-40 flex w-52 shrink-0 items-center justify-between border-r border-line bg-muted px-3 py-2 shadow-xs">
                <span className="font-serif text-small font-semibold text-ink">
                  Rooms
                </span>
                <span className="font-mono text-caption text-muted-foreground">
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
                    <Button
                      key={date}
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onSelectDate(date)}
                      title={`Click to view breakdown for ${date}`}
                      aria-label={`View daily breakdown for ${date}`}
                      className={`h-auto w-24 shrink-0 flex-col rounded-none border-r border-line/60 py-2 font-mono ${
                        isToday
                          ? 'bg-primary/20 text-brand-ink'
                          : weekend
                            ? 'bg-muted/90 text-ink'
                            : 'bg-muted text-ink'
                      } ${monthBoundary ? 'border-l-2 border-l-ink/40' : ''}`}
                    >
                      <span className="font-sans text-micro font-medium tracking-wider text-muted-foreground uppercase">
                        {getDayOfWeek(date)}
                      </span>
                      <span className="font-mono text-small font-semibold">
                        {date.slice(8)}
                      </span>
                      {isToday && <Badge>TODAY</Badge>}
                    </Button>
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
            <div className="divide-y divide-line/60">
              {roomsByType.map((group) => {
                const isCollapsed = !!collapsedGroups[group.id];

                return (
                  <div key={group.id} className="divide-y divide-line/40">
                    {/* Collapsible Room Type Header */}
                    <div className="sticky left-0 flex w-full border-y border-line bg-muted/80 text-small font-medium">
                      {/* Left Sticky Label with Accordion Button */}
                      <div className="sticky left-0 z-20 flex w-52 shrink-0 items-center justify-between gap-1.5 border-r border-line bg-muted/95 px-3 py-1.5 shadow-xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => toggleGroup(group.id)}
                          className="h-auto min-w-0 flex-1 justify-start gap-1.5 p-0 text-left font-semibold"
                          aria-expanded={!isCollapsed}
                          title={group.name}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{group.name}</span>
                        </Button>
                        <span className="shrink-0 font-mono text-caption text-muted-foreground">
                          ({group.rooms.length})
                        </span>
                      </div>

                      {/* Free Units Across Dates (Visible when collapsed or expanded) */}
                      <div className="flex">
                        {dates.map((date) => {
                          const stat = data.stats.find((s) => s.date === date);
                          const freeCount =
                            stat?.freeByType[group.id]?.free ?? 0;
                          const totalCount =
                            stat?.freeByType[group.id]?.total ??
                            group.rooms.length;

                          return (
                            <div
                              key={date}
                              className="flex w-24 shrink-0 items-center justify-center border-r border-line/40 px-1 py-1 font-mono text-micro"
                            >
                              <span
                                className={`py-0.2 rounded-control px-1 ${
                                  freeCount === 0
                                    ? 'bg-destructive/10 font-semibold text-destructive'
                                    : 'text-muted-foreground'
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
                            className="relative flex h-14 items-center transition-colors hover:bg-muted/20"
                          >
                            {/* Sticky Room Column */}
                            <div className="sticky left-0 z-20 flex h-full w-52 shrink-0 items-center justify-between border-r border-line bg-paper px-3 shadow-xs">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-small font-semibold text-ink">
                                    #{room.roomNumber}
                                  </span>
                                  {room.floor !== null && (
                                    <span className="text-caption text-muted-foreground">
                                      • F{room.floor}
                                    </span>
                                  )}
                                </div>
                                <span className="text-micro text-muted-foreground">
                                  {room.roomTypeName}
                                </span>
                              </div>

                              {isOutOfService && (
                                <span className="rounded-control bg-primary/15 px-1.5 py-0.5 text-micro font-semibold text-brand-ink">
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
                                  <Button
                                    key={date}
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => handleCellClick(room, date)}
                                    disabled={isOutOfService}
                                    aria-label={`Room ${room.roomNumber}, ${formatShort(date)}`}
                                    className={`relative h-full w-24 shrink-0 rounded-none border-r border-line/40 p-0 ${
                                      isOutOfService
                                        ? 'bg-stripes-muted cursor-not-allowed opacity-60'
                                        : isStartCell
                                          ? 'bg-ink/10 ring-2 ring-ink ring-inset'
                                          : isToday
                                            ? 'bg-primary/10'
                                            : weekend
                                              ? 'bg-muted/30'
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
                                  let barBg =
                                    'bg-success text-success-foreground';
                                  if (res.status === 'pending') {
                                    barBg =
                                      'bg-primary text-primary-foreground border border-primary/40';
                                  } else if (res.status === 'checked_in') {
                                    barBg = 'bg-ink text-paper';
                                  } else if (res.status === 'checked_out') {
                                    barBg =
                                      'bg-muted-foreground/60 text-white opacity-80';
                                  }

                                  return (
                                    <Tooltip key={res.id}>
                                      <TooltipTrigger
                                        render={
                                          <Link
                                            href={`/admin/reservations/${res.id}`}
                                            aria-label={`${res.guestName} (${res.reference}), ${formatShort(res.checkIn)} to ${formatShort(res.checkOut)}, Status: ${res.status}`}
                                            style={{
                                              left: `${leftPx + 2}px`,
                                              width: `${widthPx}px`,
                                            }}
                                            className={`absolute top-2 z-10 flex h-10 items-center justify-between rounded-control px-2 shadow-xs transition-transform hover:scale-[1.01] focus:outline-hidden ${barBg}`}
                                          />
                                        }
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                                          <span className="block min-w-0 truncate text-caption font-semibold">
                                            {res.guestName}
                                          </span>
                                          {spanNights >= 2 && (
                                            <span className="shrink-0 font-mono text-micro opacity-80">
                                              ({res.reference})
                                            </span>
                                          )}
                                        </div>

                                        {/* Hold expiration warning for pending */}
                                        {res.status === 'pending' && (
                                          <span className="ml-1 flex shrink-0 items-center gap-0.5 font-mono text-micro font-bold">
                                            <Clock className="size-3 shrink-0" />
                                            {spanNights >= 2 && (
                                              <span>Held</span>
                                            )}
                                          </span>
                                        )}
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="font-sans text-caption"
                                      >
                                        <p className="font-semibold text-paper">
                                          {res.guestName}{' '}
                                          <span className="font-mono text-white/70">
                                            ({res.reference})
                                          </span>
                                        </p>
                                        <p className="text-micro text-white/80">
                                          Room #{room.roomNumber} •{' '}
                                          {formatShort(res.checkIn)} →{' '}
                                          {formatShort(res.checkOut)} (
                                          {spanNights}n)
                                        </p>
                                        <p className="mt-0.5 text-micro text-brand-ink capitalize">
                                          Status: {res.status.replace('_', ' ')}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
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
                                    <Tooltip key={block.id}>
                                      <TooltipTrigger
                                        render={
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="xs"
                                            onClick={() => onEditBlock(block)}
                                            aria-label={`Blocked room ${room.roomNumber}: ${block.reason.replace('_', ' ')}, ${formatShort(block.startDate)} to ${formatShort(block.endDate)}`}
                                            style={{
                                              left: `${leftPx + 2}px`,
                                              width: `${widthPx}px`,
                                            }}
                                            className="absolute top-2 z-10 h-10 w-auto justify-between border-destructive/40 bg-destructive/15 px-2 text-destructive hover:bg-destructive/25"
                                          />
                                        }
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                                          <ShieldAlert className="size-3.5 shrink-0" />
                                          <span className="block min-w-0 truncate text-caption font-semibold uppercase">
                                            {block.reason.replace('_', ' ')}
                                          </span>
                                          {spanNights >= 2 && block.notes && (
                                            <span className="block min-w-0 truncate text-micro text-destructive/80">
                                              • {block.notes}
                                            </span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="font-sans text-caption"
                                      >
                                        <p className="font-semibold text-paper uppercase">
                                          Blocked:{' '}
                                          {block.reason.replace('_', ' ')}
                                        </p>
                                        <p className="text-micro text-white/80">
                                          Room #{room.roomNumber} •{' '}
                                          {formatShort(block.startDate)} →{' '}
                                          {formatShort(block.endDate)}
                                        </p>
                                        {block.notes && (
                                          <p className="mt-0.5 text-micro text-white/70 italic">
                                            {block.notes}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
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
          <div className="sticky bottom-4 z-40 mx-auto flex w-full max-w-lg animate-in items-center justify-between rounded-card border border-ink bg-ink p-3.5 text-paper shadow-float fade-in slide-in-from-bottom-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-small font-semibold">
                  {nightsBetween(
                    activeSelection.checkIn,
                    activeSelection.checkOut,
                  )}{' '}
                  Night(s) Selected
                </span>
                <span className="font-mono text-caption text-paper/70">
                  ({formatShort(activeSelection.checkIn)} →{' '}
                  {formatShort(activeSelection.checkOut)})
                </span>
              </div>
              {activeSelection.hasConflict ? (
                <p className="mt-0.5 text-caption text-destructive-on-dark">
                  {activeSelection.conflictReason}
                </p>
              ) : (
                <p className="mt-0.5 text-caption text-paper/70">
                  Choose an action to proceed with this room and date range:
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!activeSelection.hasConflict && (
                <>
                  <ButtonLink
                    variant="secondary"
                    href={`/admin/reservations/new?roomId=${encodeURIComponent(
                      activeSelection.roomId,
                    )}&checkIn=${encodeURIComponent(
                      activeSelection.checkIn,
                    )}&checkOut=${encodeURIComponent(activeSelection.checkOut)}`}
                  >
                    New Reservation
                  </ButtonLink>

                  <Button
                    variant="dark"
                    onClick={() => {
                      onStartBlockWithRange(
                        activeSelection.roomId,
                        activeSelection.checkIn,
                        activeSelection.checkOut,
                      );
                      setActiveSelection(null);
                    }}
                  >
                    Block Dates
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setActiveSelection(null)}
                aria-label="Dismiss selection"
                className="text-paper/70 hover:bg-white/10 hover:text-paper"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Grid Legend at Bottom */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-muted/40 px-4 py-2.5 text-caption text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-ink">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs bg-success" />
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs bg-ink" />
              <span>Checked In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs bg-primary" />
              <span>Pending Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs bg-muted-foreground/60" />
              <span>Checked Out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs border border-destructive/50 bg-destructive/20" />
              <span>Room Block</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-stripes-muted size-3 rounded-xs border border-line" />
              <span>Out of Service</span>
            </div>
          </div>

          <div className="font-mono text-micro text-muted-foreground">
            Turnover: Adjacent bars separated by turnover divider • Check-out
            day is free for check-in
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
