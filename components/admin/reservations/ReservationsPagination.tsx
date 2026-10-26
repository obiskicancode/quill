'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReservationsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export function ReservationsPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: ReservationsPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div
      aria-label="Pagination Navigation"
      className="rounded-card border-line bg-surface shadow-raised flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-small text-muted flex items-center gap-3">
        <span>
          Showing <strong className="text-ink">{start}</strong> to{' '}
          <strong className="text-ink">{end}</strong> of{' '}
          <strong className="text-ink">{total}</strong> reservations
        </span>

        <div className="border-line flex items-center gap-1.5 border-l pl-2">
          <label htmlFor="pageSizeSelect" className="text-caption font-medium">
            Per page:
          </label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-control border-line bg-paper text-caption text-ink focus:border-ink h-8 border px-2 font-semibold focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Go to previous page"
          className="rounded-control border-line text-small text-ink hover:bg-paper inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border px-3 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="text-caption text-muted px-2 font-semibold">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Go to next page"
          className="rounded-control border-line text-small text-ink hover:bg-paper inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border px-3 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
