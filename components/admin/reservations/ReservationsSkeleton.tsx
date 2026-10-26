export function ReservationsSkeleton() {
  return (
    <div role="status" aria-label="Loading reservations" className="space-y-4">
      {/* Desktop Table Skeleton */}
      <div className="rounded-card border-line bg-surface shadow-raised hidden border p-4 md:block">
        <div className="border-line flex items-center justify-between border-b pb-3">
          <div className="bg-line/60 h-4 w-32 animate-pulse rounded" />
          <div className="bg-line/40 h-4 w-24 animate-pulse rounded" />
        </div>
        <div className="divide-line divide-y pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <div className="bg-line/60 h-4 w-28 animate-pulse rounded" />
              <div className="bg-line/80 h-4 w-40 animate-pulse rounded" />
              <div className="bg-line/50 h-4 w-24 animate-pulse rounded" />
              <div className="bg-line/50 h-4 w-32 animate-pulse rounded" />
              <div className="bg-line/40 h-5 w-16 animate-pulse rounded-full" />
              <div className="bg-line/40 h-5 w-16 animate-pulse rounded-full" />
              <div className="bg-line/70 ml-auto h-4 w-20 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border-line bg-surface shadow-raised border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="bg-line/70 h-4 w-24 animate-pulse rounded" />
              <div className="bg-line/40 h-5 w-16 animate-pulse rounded-full" />
            </div>
            <div className="bg-line/80 mt-2.5 h-4 w-36 animate-pulse rounded" />
            <div className="bg-line/50 mt-2 h-3.5 w-48 animate-pulse rounded" />
            <div className="border-line/60 mt-3 flex items-center justify-between border-t pt-2.5">
              <div className="bg-line/40 h-3.5 w-20 animate-pulse rounded" />
              <div className="bg-line/70 h-4 w-20 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
