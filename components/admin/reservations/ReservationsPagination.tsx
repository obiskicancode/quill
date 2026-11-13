'use client';

import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReservationsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

/** Page navigation and result count for the reservations list. */
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
      className="flex flex-col flex-wrap gap-3 rounded-card border border-line bg-card p-3.5 shadow-raised sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3 text-small text-muted-foreground">
        <span>
          Showing <strong className="text-ink">{start}</strong> to{' '}
          <strong className="text-ink">{end}</strong> of{' '}
          <strong className="text-ink">{total}</strong> reservations
        </span>

        <div className="flex items-center gap-1.5 border-l border-line pl-2">
          <Label htmlFor="pageSizeSelect" className="text-caption font-medium">
            Per page:
          </Label>
          <Select
            items={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            value={String(pageSize)}
            onValueChange={(val) => {
              if (val) onPageSizeChange(Number(val));
            }}
          >
            <SelectTrigger id="pageSizeSelect" size="sm" className="w-17.5">
              <SelectValue placeholder="25" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            />
          </PaginationItem>

          <PaginationItem>
            <span className="px-2 text-caption font-semibold text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
