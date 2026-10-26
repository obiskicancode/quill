'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/Button';
import { addDays, formatMonthYear } from '@/lib/dates';

interface CalendarHeaderProps {
  from: string;
  days: number;
  today: string;
  roomTypeId?: string;
  roomTypes: { id: string; name: string; slug: string }[];
  view: 'grid' | 'agenda';
  onFromChange: (newFrom: string) => void;
  onDaysChange: (newDays: number) => void;
  onRoomTypeChange: (newRoomTypeId: string | undefined) => void;
  onViewChange: (newView: 'grid' | 'agenda') => void;
  onOpenBlockModal: () => void;
}

export function CalendarHeader({
  from,
  days,
  today,
  roomTypeId,
  roomTypes,
  view,
  onFromChange,
  onDaysChange,
  onRoomTypeChange,
  onViewChange,
  onOpenBlockModal,
}: CalendarHeaderProps) {
  const handlePrev = () => {
    onFromChange(addDays(from, -days));
  };

  const handleNext = () => {
    onFromChange(addDays(from, days));
  };

  const handleToday = () => {
    onFromChange(today);
  };

  return (
    <div className="border-line flex flex-col gap-4 border-b pb-4">
      {/* Top row: Title and Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 text-ink font-serif font-semibold">
            Calendar
          </h1>
          <p className="text-small text-muted">
            Live occupancy, reservations and room blocks •{' '}
            {formatMonthYear(from)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Blocks Management Link */}
          <Link
            href="/admin/calendar/blocks"
            className="hover:bg-canvas rounded-control border-line bg-paper text-small text-ink inline-flex items-center gap-1.5 border px-3 py-1.5 font-medium transition-colors focus:outline-hidden"
          >
            <ShieldAlert className="text-muted size-4" />
            <span>Manage Blocks</span>
          </Link>

          {/* Quick Block Dates */}
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenBlockModal}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>Block dates</span>
          </Button>

          {/* New Reservation */}
          <Link
            href="/admin/reservations/new"
            className="rounded-control bg-ink text-small text-paper inline-flex items-center gap-1.5 px-4 py-2 font-medium transition-opacity hover:opacity-90 focus:outline-hidden active:opacity-100"
          >
            <Plus className="size-4" />
            <span>New reservation</span>
          </Link>
        </div>
      </div>

      {/* Controls row: Date range navigation, range tabs, filter, view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date stepper & Jump */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-control border-line bg-paper flex items-center border p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handlePrev}
              title={`Previous ${days} days`}
              aria-label={`Previous ${days} days`}
              className="hover:bg-canvas rounded-control text-muted hover:text-ink p-1.5 transition-colors focus:outline-hidden"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className={`rounded-control text-caption px-2.5 py-1 font-medium transition-colors focus:outline-hidden ${
                from === today
                  ? 'bg-ink text-paper'
                  : 'hover:bg-canvas text-ink'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              title={`Next ${days} days`}
              aria-label={`Next ${days} days`}
              className="hover:bg-canvas rounded-control text-muted hover:text-ink p-1.5 transition-colors focus:outline-hidden"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Date jump */}
          <div className="relative flex items-center">
            <input
              type="date"
              aria-label="Jump to specific date"
              value={from}
              onChange={(e) => {
                if (e.target.value) onFromChange(e.target.value);
              }}
              className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink border px-2.5 py-1 font-medium shadow-xs focus:outline-hidden"
            />
          </div>

          {/* Range tabs (14, 30, 60 days) */}
          <div className="rounded-control border-line bg-paper flex items-center border p-0.5 shadow-xs">
            {[14, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysChange(d)}
                className={`rounded-control text-caption px-2.5 py-1 font-medium transition-colors focus:outline-hidden ${
                  days === d
                    ? 'bg-ink text-paper'
                    : 'hover:bg-canvas text-muted hover:text-ink'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Room type filter & Grid/Agenda toggle */}
        <div className="flex items-center gap-2">
          {/* Room Type Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="text-muted size-3.5" />
            <select
              aria-label="Filter by room type"
              value={roomTypeId || ''}
              onChange={(e) => onRoomTypeChange(e.target.value || undefined)}
              className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink border px-2.5 py-1 font-medium shadow-xs focus:outline-hidden"
            >
              <option value="">All Room Types</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grid vs Agenda Toggle */}
          <div className="rounded-control border-line bg-paper flex items-center border p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              title="Grid View"
              aria-label="Switch to grid view"
              className={`rounded-control p-1.5 transition-colors focus:outline-hidden ${
                view === 'grid'
                  ? 'bg-ink text-paper'
                  : 'hover:bg-canvas text-muted hover:text-ink'
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange('agenda')}
              title="Agenda View"
              aria-label="Switch to agenda view"
              className={`rounded-control p-1.5 transition-colors focus:outline-hidden ${
                view === 'agenda'
                  ? 'bg-ink text-paper'
                  : 'hover:bg-canvas text-muted hover:text-ink'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
