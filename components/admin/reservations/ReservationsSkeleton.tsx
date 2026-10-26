import { Skeleton } from '@/components/ui/skeleton';

export function ReservationsSkeleton() {
  return (
    <div role="status" aria-label="Loading reservations" className="space-y-4">
      {/* Desktop Table Skeleton */}
      <div className="rounded-card border-line bg-card shadow-raised hidden border p-4 md:block">
        <div className="border-line flex items-center justify-between border-b pb-3">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="divide-line divide-y pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border-line bg-card shadow-raised border p-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2.5 h-4 w-36 rounded" />
            <Skeleton className="mt-2 h-3.5 w-48 rounded" />
            <div className="border-line/60 mt-3 flex items-center justify-between border-t pt-2.5">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
