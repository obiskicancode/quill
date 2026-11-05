'use client';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Plus,
  ShieldAlert,
} from 'lucide-react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <div className="flex flex-col gap-4 border-b border-line pb-4">
      {/* Top row: Title and Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-h2 font-semibold text-ink">
            Calendar
          </h1>
          <p className="text-small text-muted-foreground">
            Live occupancy, reservations and room blocks •{' '}
            {formatMonthYear(from)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Blocks Management Link */}
          <ButtonLink
            href="/admin/calendar/blocks"
            variant="secondary"
            size="sm"
            icon={<ShieldAlert className="size-4" />}
          >
            Manage Blocks
          </ButtonLink>

          {/* Quick Block Dates */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenBlockModal}
            icon={<Plus className="size-4" />}
          >
            Block dates
          </Button>

          {/* New Reservation */}
          <ButtonLink
            href="/admin/reservations/new"
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
          >
            New reservation
          </ButtonLink>
        </div>
      </div>

      {/* Controls row: Date range navigation, range tabs, filter, view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date stepper & Jump */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center rounded-control border border-line bg-paper p-0.5 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handlePrev}
              title={`Previous ${days} days`}
              aria-label={`Previous ${days} days`}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant={from === today ? 'primary' : 'ghost'}
              size="xs"
              onClick={handleToday}
              className="h-7 px-2.5"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleNext}
              title={`Next ${days} days`}
              aria-label={`Next ${days} days`}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Date jump */}
          <div className="relative flex items-center">
            <Input
              type="date"
              aria-label="Jump to specific date"
              value={from}
              onChange={(e) => {
                if (e.target.value) onFromChange(e.target.value);
              }}
              className="h-8 w-auto px-2.5 text-caption font-medium"
            />
          </div>

          {/* Range tabs (14, 30, 60 days) */}
          <div className="flex h-8 items-center rounded-control border border-line bg-paper p-0.5 shadow-xs">
            {[14, 30, 60].map((d) => (
              <Button
                key={d}
                type="button"
                variant={days === d ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => onDaysChange(d)}
                className="h-7 px-2.5"
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>

        {/* Right side: Room type filter & Grid/Agenda toggle */}
        <div className="flex items-center gap-2">
          {/* Room Type Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select
              items={[
                { value: 'all', label: 'All Room Types' },
                ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
              ]}
              value={roomTypeId || 'all'}
              onValueChange={(val) =>
                onRoomTypeChange(val === 'all' || !val ? undefined : val)
              }
            >
              <SelectTrigger aria-label="Filter by room type" className="w-40">
                <SelectValue placeholder="All Room Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Room Types</SelectItem>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid vs Agenda Toggle */}
          <div className="flex h-8 items-center rounded-control border border-line bg-paper p-0.5 shadow-xs">
            <Button
              type="button"
              variant={view === 'grid' ? 'primary' : 'ghost'}
              size="icon-sm"
              onClick={() => onViewChange('grid')}
              title="Grid View"
              aria-label="Switch to grid view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant={view === 'agenda' ? 'primary' : 'ghost'}
              size="icon-sm"
              onClick={() => onViewChange('agenda')}
              title="Agenda View"
              aria-label="Switch to agenda view"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
