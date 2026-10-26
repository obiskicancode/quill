export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" role="status">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-card border-line bg-surface shadow-raised flex min-h-[7.5rem] flex-col justify-between border p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="bg-line/60 h-4 w-24 animate-pulse rounded" />
              <div className="rounded-control bg-line/40 size-7 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="bg-line/80 h-8 w-16 animate-pulse rounded" />
              <div className="bg-line/40 h-3 w-28 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Attention Skeleton */}
      <div className="rounded-card border-line bg-surface shadow-raised border p-5">
        <div className="bg-line/80 h-5 w-36 animate-pulse rounded" />
        <div className="mt-4 space-y-3">
          <div className="rounded-control bg-line/30 h-10 animate-pulse" />
          <div className="rounded-control bg-line/30 h-10 animate-pulse" />
        </div>
      </div>

      {/* Two Tables Skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-card border-line bg-surface shadow-raised border p-5"
          >
            <div className="border-line flex items-center justify-between border-b pb-4">
              <div className="bg-line/80 h-5 w-32 animate-pulse rounded" />
              <div className="bg-line/40 h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="rounded-control bg-line/20 h-12 animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Strip Skeleton */}
      <div className="rounded-card border-line bg-surface shadow-raised border p-5">
        <div className="bg-line/80 h-5 w-44 animate-pulse rounded" />
        <div className="mt-6 flex h-36 items-end gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="bg-line/40 flex-1 animate-pulse rounded-t"
              style={{ height: `${30 + (i % 5) * 15}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
