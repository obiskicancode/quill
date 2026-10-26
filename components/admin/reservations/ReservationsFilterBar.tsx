'use client';

import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
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

const PRESET_OPTIONS: { id: QuickFilter; label: string }[] = [
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
            className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            key={currentFilters.q ?? ''}
            type="search"
            defaultValue={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search reference, guest name, email, phone, room #…"
            aria-label="Search reservations"
            className="rounded-control border-line bg-surface text-small text-ink placeholder:text-muted focus:border-ink h-11 w-full border pr-10 pl-10 focus:outline-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                onFilterChange({ q: undefined });
              }}
              aria-label="Clear search query"
              className="rounded-control text-muted hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 p-1 focus:outline-none"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile bottom sheet trigger */}
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Open filter options"
            className="rounded-control border-line bg-surface text-small text-ink inline-flex min-h-11 items-center gap-2 border px-3.5 font-semibold sm:hidden"
          >
            <Filter className="size-4" aria-hidden="true" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-accent size-2 rounded-full" />
            )}
          </button>

          {/* Desktop expandable filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={`rounded-control text-small hidden min-h-11 items-center gap-2 border px-3.5 font-semibold transition-colors sm:inline-flex ${
              filtersOpen || hasActiveFilters
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-surface text-ink hover:bg-paper'
            }`}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>All filters</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

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
        <span className="text-caption text-muted mr-1 font-semibold tracking-wider uppercase">
          Filters:
        </span>
        {PRESET_OPTIONS.map((p) => {
          const active = currentFilters.filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleFilterToggle(p.id)}
              className={`rounded-control text-caption min-h-8 border px-2.5 font-semibold transition-all ${
                active
                  ? 'border-accent bg-accent text-ink shadow-raised'
                  : 'border-line bg-surface text-muted hover:border-ink/40 hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Desktop Detailed Filter Panel (Expandable) */}
      {filtersOpen && (
        <div className="rounded-card border-line bg-surface shadow-raised hidden border p-4 sm:block">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Status multi-select */}
            <div>
              <p className="text-caption text-muted mb-2 font-semibold tracking-wider uppercase">
                Status
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {STATUS_OPTIONS.map((s) => {
                  const checked = (currentFilters.status ?? []).includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="text-small text-ink flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleStatusToggle(s.id)}
                        className="border-line text-accent focus:ring-accent size-4 rounded"
                      />
                      <span>{s.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date field & range */}
            <div>
              <p className="text-caption text-muted mb-2 font-semibold tracking-wider uppercase">
                Date Filter
              </p>
              <div className="space-y-2">
                <select
                  value={currentFilters.dateField ?? 'check_in'}
                  onChange={(e) =>
                    onFilterChange({ dateField: e.target.value })
                  }
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink h-9 w-full border px-2 focus:outline-none"
                >
                  <option value="check_in">Check-in date</option>
                  <option value="check_out">Check-out date</option>
                  <option value="created_at">Booked on date</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={currentFilters.from ?? ''}
                    onChange={(e) =>
                      onFilterChange({ from: e.target.value || undefined })
                    }
                    className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink h-8 w-full border px-1.5 focus:outline-none"
                  />
                  <span className="text-caption text-muted">to</span>
                  <input
                    type="date"
                    value={currentFilters.to ?? ''}
                    onChange={(e) =>
                      onFilterChange({ to: e.target.value || undefined })
                    }
                    className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink h-8 w-full border px-1.5 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Room Type & Room */}
            <div>
              <p className="text-caption text-muted mb-2 font-semibold tracking-wider uppercase">
                Room Inventory
              </p>
              <div className="space-y-2">
                <select
                  value={currentFilters.roomTypeId ?? ''}
                  onChange={(e) =>
                    onFilterChange({ roomTypeId: e.target.value || undefined })
                  }
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink h-9 w-full border px-2 focus:outline-none"
                >
                  <option value="">All room types</option>
                  {options.roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>

                <select
                  value={currentFilters.roomId ?? ''}
                  onChange={(e) =>
                    onFilterChange({ roomId: e.target.value || undefined })
                  }
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink h-9 w-full border px-2 focus:outline-none"
                >
                  <option value="">All room numbers</option>
                  {options.rooms
                    .filter(
                      (r) =>
                        !currentFilters.roomTypeId ||
                        r.roomTypeId === currentFilters.roomTypeId,
                    )
                    .map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        Room #{rm.roomNumber}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Source & Payment State */}
            <div>
              <p className="text-caption text-muted mb-2 font-semibold tracking-wider uppercase">
                Payment & Source
              </p>
              <div className="space-y-2">
                <select
                  value={currentFilters.paymentState ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      paymentState: e.target.value || undefined,
                    })
                  }
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink h-9 w-full border px-2 focus:outline-none"
                >
                  <option value="">All payment states</option>
                  {PAYMENT_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  value={currentFilters.source ?? ''}
                  onChange={(e) =>
                    onFilterChange({ source: e.target.value || undefined })
                  }
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink h-9 w-full border px-2 focus:outline-none"
                >
                  <option value="">All booking sources</option>
                  {SOURCE_OPTIONS.map((src) => (
                    <option key={src.id} value={src.id}>
                      {src.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {currentFilters.q && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Query: {currentFilters.q}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ q: undefined })}
                aria-label="Remove search filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {(currentFilters.status ?? []).map((st) => (
            <span
              key={st}
              className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium"
            >
              <span>Status: {st}</span>
              <button
                type="button"
                onClick={() => handleStatusToggle(st)}
                aria-label={`Remove status ${st} filter`}
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}

          {currentFilters.filter && (
            <span className="border-accent bg-accent/20 text-caption text-accent-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold">
              <span>Filter: {currentFilters.filter.replace('_', ' ')}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ filter: undefined })}
                aria-label="Remove filter filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.from && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>From: {currentFilters.from}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ from: undefined })}
                aria-label="Remove from date filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.to && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>To: {currentFilters.to}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ to: undefined })}
                aria-label="Remove to date filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.roomTypeId && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>
                Room type:{' '}
                {options.roomTypes.find(
                  (r) => r.id === currentFilters.roomTypeId,
                )?.name ?? 'selected'}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ roomTypeId: undefined })}
                aria-label="Remove room type filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.roomId && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>
                Room:{' '}
                {options.rooms.find((r) => r.id === currentFilters.roomId)
                  ?.roomNumber ?? 'selected'}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ roomId: undefined })}
                aria-label="Remove room number filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.paymentState && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Payment: {currentFilters.paymentState}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ paymentState: undefined })}
                aria-label="Remove payment state filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {currentFilters.source && (
            <span className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium">
              <span>Source: {currentFilters.source}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ source: undefined })}
                aria-label="Remove booking source filter"
                className="hover:text-danger"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Mobile Filter Bottom Sheet Dialog */}
      {mobileSheetOpen && (
        <dialog
          open
          className="rounded-t-card border-line bg-surface shadow-float fixed inset-0 z-50 m-auto flex h-[85vh] w-full flex-col justify-between border-t p-5 sm:hidden"
        >
          <div className="border-line flex items-center justify-between border-b pb-3">
            <h3 className="font-display text-h3 text-ink">
              Filter Reservations
            </h3>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              aria-label="Close filters"
              className="rounded-control text-muted hover:text-ink p-1"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-3">
            {/* Status */}
            <div>
              <p className="text-caption text-muted mb-2 font-semibold tracking-wider uppercase">
                Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const checked = (currentFilters.status ?? []).includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStatusToggle(s.id)}
                      className={`rounded-control text-caption flex min-h-11 items-center justify-between border px-3 font-semibold ${
                        checked
                          ? 'border-accent bg-accent/15 text-accent-ink'
                          : 'border-line bg-paper text-ink'
                      }`}
                    >
                      <span>{s.label}</span>
                      {checked && (
                        <Check className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Type */}
            <div>
              <label
                htmlFor="mobRoomType"
                className="text-caption text-muted mb-1 block font-semibold uppercase"
              >
                Room Type
              </label>
              <select
                id="mobRoomType"
                value={currentFilters.roomTypeId ?? ''}
                onChange={(e) =>
                  onFilterChange({ roomTypeId: e.target.value || undefined })
                }
                className="rounded-control border-line bg-paper text-small text-ink h-11 w-full border px-3"
              >
                <option value="">All room types</option>
                {options.roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment State */}
            <div>
              <label
                htmlFor="mobPaymentState"
                className="text-caption text-muted mb-1 block font-semibold uppercase"
              >
                Payment State
              </label>
              <select
                id="mobPaymentState"
                value={currentFilters.paymentState ?? ''}
                onChange={(e) =>
                  onFilterChange({ paymentState: e.target.value || undefined })
                }
                className="rounded-control border-line bg-paper text-small text-ink h-11 w-full border px-3"
              >
                <option value="">All payment states</option>
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
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
        </dialog>
      )}
    </div>
  );
}
