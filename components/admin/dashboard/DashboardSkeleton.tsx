import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" role="status">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-card border-line bg-card shadow-raised flex min-h-[7.5rem] flex-col justify-between border p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="rounded-control size-7" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Attention Skeleton */}
      <div className="rounded-card border-line bg-card shadow-raised border p-5">
        <Skeleton className="h-5 w-36 rounded" />
        <div className="mt-4 space-y-3">
          <Skeleton className="rounded-control h-10 w-full" />
          <Skeleton className="rounded-control h-10 w-full" />
        </div>
      </div>

      {/* Two Tables Skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-card border-line bg-card shadow-raised border p-5"
          >
            <div className="border-line flex items-center justify-between border-b pb-4">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="rounded-control h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Strip Skeleton */}
      <div className="rounded-card border-line bg-card shadow-raised border p-5">
        <Skeleton className="h-5 w-44 rounded" />
        <div className="mt-6 flex h-36 items-end gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + (i % 5) * 15}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
