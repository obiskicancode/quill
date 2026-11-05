import { Skeleton } from '@/components/ui/skeleton';

export function ReservationsSkeleton() {
  return (
    <div role="status" aria-label="Loading reservations" className="space-y-4">
      {/* Desktop Table Skeleton */}
      <div className="hidden rounded-card border border-line bg-card p-4 shadow-raised md:block">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-4 w-24 rounded-sm" />
        </div>
        <div className="divide-y divide-line pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-4 w-40 rounded-sm" />
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-4 w-32 rounded-sm" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-line bg-card p-4 shadow-raised"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2.5 h-4 w-36 rounded-sm" />
            <Skeleton className="mt-2 h-3.5 w-48 rounded-sm" />
            <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
              <Skeleton className="h-3.5 w-20 rounded-sm" />
              <Skeleton className="h-4 w-20 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
