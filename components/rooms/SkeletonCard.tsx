import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card"
    >
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4 rounded-sm" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-4 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-auto space-y-4 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40 rounded-sm" />
              <Skeleton className="h-4 w-28 rounded-sm" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-control" />
            <Skeleton className="h-11 flex-1 rounded-control" />
          </div>
        </div>
      </div>
    </div>
  );
}
