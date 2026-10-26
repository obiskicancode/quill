'use client';

import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  BookingSource,
  PaymentState,
  QuickFilter,
  ReservationListItem,
} from '@/types/reservation.types';

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'checked_in', label: 'Checked in' },
  { id: 'checked_out', label: 'Checked out' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no_show', label: 'No show' },
  { id: 'expired', label: 'Expired' },
];

const SOURCE_OPTIONS: { id: BookingSource; label: string }[] = [
  { id: 'website', label: 'Website direct' },
  { id: 'admin', label: 'Front desk / Admin' },
  { id: 'phone', label: 'Phone call' },
  { id: 'walk_in', label: 'Walk-in' },
];

const PAYMENT_OPTIONS: { id: PaymentState; label: string }[] = [
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'deposit_paid', label: 'Deposit paid' },
  { id: 'fully_paid', label: 'Fully paid' },
  { id: 'refunded', label: 'Refunded' },
];

const FILTER_OPTIONS: { id: QuickFilter; label: string }[] = [
  { id: 'arriving_today', label: 'Arriving today' },
  { id: 'departing_today', label: 'Departing today' },
  { id: 'in_house', label: 'In house' },
  { id: 'needs_attention', label: 'Needs attention' },
];

interface ReservationsFilterBarProps {
  currentFilters: {
    q?: string;
    status?: string[];
    dateField?: string;
    from?: string;
    to?: string;
    roomTypeId?: string;
    roomId?: string;
    source?: string;
    paymentState?: string;
    filter?: string;
  };
  options: {
    roomTypes: { id: string; name: string }[];
    rooms: { id: string; roomNumber: string; roomTypeId: string }[];
  };
  onFilterChange: (
    newFilters: Record<string, string | string[] | undefined>,
  ) => void;
  rows?: ReservationListItem[];
}

export function ReservationsFilterBar({
  currentFilters,
  options,
  onFilterChange,
  rows = [],
}: ReservationsFilterBarProps) {
  const router = useRouter();

  // Search state with debounce
  const [searchValue, setSearchValue] = useState(currentFilters.q ?? '');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      if ((currentFilters.q ?? '') !== searchValue.trim()) {
        onFilterChange({ q: searchValue.trim() || undefined });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, currentFilters.q, onFilterChange]);

  // Handle direct navigation on Enter for reference-shaped input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchValue.trim();
      if (!q) return;

      // If matches reference pattern DEL-XXXX or is exact match in current rows
      const match = rows.find(
        (r) => r.reference.toLowerCase() === q.toLowerCase(),
      );
      if (match) {
        router.push(`/admin/reservations/${match.id}`);
      }
    }
  };

  const hasActiveFilters = Boolean(
    currentFilters.q ||
    (currentFilters.status && currentFilters.status.length > 0) ||
    currentFilters.dateField ||
    currentFilters.from ||
    currentFilters.to ||
    currentFilters.roomTypeId ||
    currentFilters.roomId ||
    currentFilters.source ||
    currentFilters.paymentState ||
    currentFilters.filter,
  );

  const handleClearAll = () => {
    setSearchValue('');
    onFilterChange({
      q: undefined,
      status: undefined,
      dateField: undefined,
      from: undefined,
      to: undefined,
      roomTypeId: undefined,
      roomId: undefined,
      source: undefined,
      paymentState: undefined,
      filter: undefined,
    });
  };

  const handleStatusToggle = (statusId: string) => {
    const current = currentFilters.status ?? [];
    const next = current.includes(statusId)
      ? current.filter((s) => s !== statusId)
      : [...current, statusId];
    onFilterChange({ status: next.length > 0 ? next : undefined });
  };

  const handleFilterToggle = (filterId: QuickFilter) => {
    if (currentFilters.filter === filterId) {
      onFilterChange({ filter: undefined });
    } else {
      onFilterChange({ filter: filterId });
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Search & Quick Action Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search Box */}
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            key={currentFilters.q ?? ''}
            type="search"
            defaultValue={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search reference, guest name, email, phone, room #…"
            aria-label="Search reservations"
            className="h-11 pr-10 pl-10 text-sm"
          />
          {searchValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setSearchValue('');
                onFilterChange({ q: undefined });
              }}
              aria-label="Clear search query"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile bottom sheet trigger */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Open filter options"
            className="h-11 gap-2 sm:hidden"
          >
            <Filter className="size-4" aria-hidden="true" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary size-2 rounded-full" />
            )}
          </Button>

          {/* Desktop expandable filter toggle */}
          <Button
            type="button"
            variant={filtersOpen || hasActiveFilters ? 'default' : 'outline'}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className="hidden h-11 items-center gap-2 sm:inline-flex"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>All filters</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="!text-caption"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-caption text-muted-foreground mr-1 font-semibold tracking-wider uppercase">
          Filters:
        </span>
        {FILTER_OPTIONS.map((p) => {
          const active = currentFilters.filter === p.id;
          return (
            <Button
              key={p.id}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="xs"
              onClick={() => handleFilterToggle(p.id)}
              className="h-8"
            >
              {p.label}
            </Button>
          );
        })}
      </div>

      {/* Desktop Detailed Filter Panel (Expandable) */}
      {filtersOpen && (
        <div className="rounded-card border-line bg-card shadow-raised hidden border p-4 sm:block">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Status multi-select */}
            <div>
              <p className="text-caption text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
                Status
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {STATUS_OPTIONS.map((s) => {
                  const checked = (currentFilters.status ?? []).includes(s.id);
                  return (
                    <Label
                      key={s.id}
                      className="text-small text-ink flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleStatusToggle(s.id)}
                      />
                      <span>{s.label}</span>
                    </Label>
                  );
                })}
              </div>
            </div>

            {/* Date field & range */}
            <div>
              <p className="text-caption text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
                Date Filter
              </p>
              <div className="space-y-2">
                <Select
                  items={[
                    { value: 'check_in', label: 'Check-in date' },
                    { value: 'check_out', label: 'Check-out date' },
                    { value: 'created_at', label: 'Booked on date' },
                  ]}
                  value={currentFilters.dateField ?? 'check_in'}
                  onValueChange={(val) => {
                    if (val) onFilterChange({ dateField: val });
                  }}
                >
                  <SelectTrigger aria-label="Date field" className="w-full">
                    <SelectValue placeholder="Date field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">Check-in date</SelectItem>
                    <SelectItem value="check_out">Check-out date</SelectItem>
                    <SelectItem value="created_at">Booked on date</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start gap-2 text-left text-xs font-normal"
                      />
                    }
                  >
                    <CalendarDays className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">
                      {currentFilters.from
                        ? currentFilters.to
                          ? `${format(parseISO(currentFilters.from), 'LLL dd, y')} - ${format(parseISO(currentFilters.to), 'LLL dd, y')}`
                          : `From ${format(parseISO(currentFilters.from), 'LLL dd, y')}`
                        : 'Select dates'}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="range"
                      selected={{
                        from: currentFilters.from
                          ? parseISO(currentFilters.from)
                          : undefined,
                        to: currentFilters.to
                          ? parseISO(currentFilters.to)
                          : undefined,
                      }}
                      onSelect={(range) => {
                        onFilterChange({
                          from: range?.from
                            ? format(range.from, 'yyyy-MM-dd')
                            : undefined,
                          to: range?.to
                            ? format(range.to, 'yyyy-MM-dd')
                            : undefined,
                        });
                      }}
                      numberOfMonths={1}
                    />
                    {(currentFilters.from || currentFilters.to) && (
                      <div className="border-line flex items-center justify-between border-t p-2">
                        <span className="text-caption text-muted-foreground">
                          Date range
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            onFilterChange({ from: undefined, to: undefined })
                          }
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Room Type & Room */}
            <div>
              <p className="text-caption text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
                Room Inventory
              </p>
              <div className="space-y-2">
                <Select
                  items={[
                    { value: 'all', label: 'All room types' },
                    ...options.roomTypes.map((rt) => ({
                      value: rt.id,
                      label: rt.name,
                    })),
                  ]}
                  value={currentFilters.roomTypeId ?? 'all'}
                  onValueChange={(val) =>
                    onFilterChange({
                      roomTypeId: val === 'all' || !val ? undefined : val,
                    })
                  }
                >
                  <SelectTrigger aria-label="Room type" className="w-full">
                    <SelectValue placeholder="All room types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All room types</SelectItem>
                    {options.roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  items={[
                    { value: 'all', label: 'All room numbers' },
                    ...options.rooms
                      .filter(
                        (r) =>
                          !currentFilters.roomTypeId ||
                          r.roomTypeId === currentFilters.roomTypeId,
                      )
                      .map((rm) => ({
                        value: rm.id,
                        label: `Room #${rm.roomNumber}`,
                      })),
                  ]}
                  value={currentFilters.roomId ?? 'all'}
                  onValueChange={(val) =>
                    onFilterChange({
                      roomId: val === 'all' || !val ? undefined : val,
                    })
                  }
                >
                  <SelectTrigger aria-label="Room number" className="w-full">
                    <SelectValue placeholder="All room numbers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All room numbers</SelectItem>
                    {options.rooms
                      .filter(
                        (r) =>
                          !currentFilters.roomTypeId ||
                          r.roomTypeId === currentFilters.roomTypeId,
                      )
                      .map((rm) => (
                        <SelectItem key={rm.id} value={rm.id}>
                          Room #{rm.roomNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source & Payment State */}
            <div>
              <p className="text-caption text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
                Payment & Source
              </p>
              <div className="space-y-2">
                <Select
                  items={[
                    { value: 'all', label: 'All payment states' },
                    ...PAYMENT_OPTIONS.map((p) => ({
                      value: p.id,
                      label: p.label,
                    })),
                  ]}
                  value={currentFilters.paymentState ?? 'all'}
                  onValueChange={(val) =>
                    onFilterChange({
                      paymentState: val === 'all' || !val ? undefined : val,
                    })
                  }
                >
                  <SelectTrigger aria-label="Payment state" className="w-full">
                    <SelectValue placeholder="All payment states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment states</SelectItem>
                    {PAYMENT_OPTIONS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  items={[
                    { value: 'all', label: 'All booking sources' },
                    ...SOURCE_OPTIONS.map((src) => ({
                      value: src.id,
                      label: src.label,
                    })),
                  ]}
                  value={currentFilters.source ?? 'all'}
                  onValueChange={(val) =>
                    onFilterChange({
                      source: val === 'all' || !val ? undefined : val,
                    })
                  }
                >
                  <SelectTrigger aria-label="Booking source" className="w-full">
                    <SelectValue placeholder="All booking sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All booking sources</SelectItem>
                    {SOURCE_OPTIONS.map((src) => (
                      <SelectItem key={src.id} value={src.id}>
                        {src.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {currentFilters.q && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Query: {currentFilters.q}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ q: undefined })}
                aria-label="Remove search filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {(currentFilters.status ?? []).map((st) => (
            <span
              key={st}
              className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium"
            >
              <span>Status: {st}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => handleStatusToggle(st)}
                aria-label={`Remove status ${st} filter`}
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          ))}

          {currentFilters.filter && (
            <span className="border-primary bg-primary/20 text-caption text-brand-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold">
              <span>Filter: {currentFilters.filter.replace('_', ' ')}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ filter: undefined })}
                aria-label="Remove filter filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.from && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>From: {currentFilters.from}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ from: undefined })}
                aria-label="Remove from date filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.to && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>To: {currentFilters.to}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ to: undefined })}
                aria-label="Remove to date filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.roomTypeId && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>
                Room type:{' '}
                {options.roomTypes.find(
                  (r) => r.id === currentFilters.roomTypeId,
                )?.name ?? 'selected'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ roomTypeId: undefined })}
                aria-label="Remove room type filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.roomId && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>
                Room:{' '}
                {options.rooms.find((r) => r.id === currentFilters.roomId)
                  ?.roomNumber ?? 'selected'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ roomId: undefined })}
                aria-label="Remove room number filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.paymentState && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Payment: {currentFilters.paymentState}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ paymentState: undefined })}
                aria-label="Remove payment state filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}

          {currentFilters.source && (
            <span className="border-line bg-card text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Source: {currentFilters.source}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onFilterChange({ source: undefined })}
                aria-label="Remove booking source filter"
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </span>
          )}
        </div>
      )}

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="rounded-t-card border-line bg-card h-[85vh] gap-0 border-t p-5 sm:hidden"
        >
          <SheetHeader className="border-line border-b px-0 pr-10 pb-3">
            <SheetTitle className="font-display text-h3 text-ink">
              Filter Reservations
            </SheetTitle>
            <SheetDescription className="sr-only">
              Filter the reservations list by status, room type, and payment
              state.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-3">
            {/* Status */}
            <div>
              <p className="text-caption text-muted-foreground mb-2 font-semibold tracking-wider uppercase">
                Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const checked = (currentFilters.status ?? []).includes(s.id);
                  return (
                    <Button
                      key={s.id}
                      variant={checked ? 'secondary' : 'outline'}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => handleStatusToggle(s.id)}
                    >
                      <span>{s.label}</span>
                      {checked && (
                        <Check className="size-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Date Filter (Mobile) */}
            <div>
              <Label
                htmlFor="mobDateField"
                className="text-caption text-muted-foreground mb-1.5 block font-semibold uppercase"
              >
                Date Filter
              </Label>
              <div className="space-y-2">
                <Select
                  items={[
                    { value: 'check_in', label: 'Check-in date' },
                    { value: 'check_out', label: 'Check-out date' },
                    { value: 'created_at', label: 'Booked on date' },
                  ]}
                  value={currentFilters.dateField ?? 'check_in'}
                  onValueChange={(val) => {
                    if (val) onFilterChange({ dateField: val });
                  }}
                >
                  <SelectTrigger id="mobDateField" className="h-11 w-full">
                    <SelectValue placeholder="Date field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">Check-in date</SelectItem>
                    <SelectItem value="check_out">Check-out date</SelectItem>
                    <SelectItem value="created_at">Booked on date</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="md"
                        className="h-11 w-full justify-start gap-2.5 text-left font-normal"
                      />
                    }
                  >
                    <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">
                      {currentFilters.from
                        ? currentFilters.to
                          ? `${format(parseISO(currentFilters.from), 'LLL dd, y')} - ${format(parseISO(currentFilters.to), 'LLL dd, y')}`
                          : `From ${format(parseISO(currentFilters.from), 'LLL dd, y')}`
                        : 'Select dates'}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-auto p-0">
                    <Calendar
                      mode="range"
                      selected={{
                        from: currentFilters.from
                          ? parseISO(currentFilters.from)
                          : undefined,
                        to: currentFilters.to
                          ? parseISO(currentFilters.to)
                          : undefined,
                      }}
                      onSelect={(range) => {
                        onFilterChange({
                          from: range?.from
                            ? format(range.from, 'yyyy-MM-dd')
                            : undefined,
                          to: range?.to
                            ? format(range.to, 'yyyy-MM-dd')
                            : undefined,
                        });
                      }}
                      numberOfMonths={1}
                    />
                    {(currentFilters.from || currentFilters.to) && (
                      <div className="border-line flex items-center justify-between border-t p-2">
                        <span className="text-caption text-muted-foreground">
                          Date range
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            onFilterChange({ from: undefined, to: undefined })
                          }
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Room Type */}
            <div>
              <Label
                htmlFor="mobRoomType"
                className="text-caption text-muted-foreground mb-1.5 block font-semibold uppercase"
              >
                Room Type
              </Label>
              <Select
                items={[
                  { value: 'all', label: 'All room types' },
                  ...options.roomTypes.map((rt) => ({
                    value: rt.id,
                    label: rt.name,
                  })),
                ]}
                value={currentFilters.roomTypeId ?? 'all'}
                onValueChange={(val) =>
                  onFilterChange({
                    roomTypeId: val === 'all' || !val ? undefined : val,
                  })
                }
              >
                <SelectTrigger id="mobRoomType" className="h-11 w-full">
                  <SelectValue placeholder="All room types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All room types</SelectItem>
                  {options.roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment State */}
            <div>
              <Label
                htmlFor="mobPaymentState"
                className="text-caption text-muted-foreground mb-1.5 block font-semibold uppercase"
              >
                Payment State
              </Label>
              <Select
                items={[
                  { value: 'all', label: 'All payment states' },
                  ...PAYMENT_OPTIONS.map((p) => ({
                    value: p.id,
                    label: p.label,
                  })),
                ]}
                value={currentFilters.paymentState ?? 'all'}
                onValueChange={(val) =>
                  onFilterChange({
                    paymentState: val === 'all' || !val ? undefined : val,
                  })
                }
              >
                <SelectTrigger id="mobPaymentState" className="h-11 w-full">
                  <SelectValue placeholder="All payment states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment states</SelectItem>
                  {PAYMENT_OPTIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-line flex gap-2 border-t pt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearAll}
              className="flex-1"
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMobileSheetOpen(false)}
              className="flex-1"
            >
              Apply filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
