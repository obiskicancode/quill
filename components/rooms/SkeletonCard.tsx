import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder with the same structure and minimum heights as the listing card
 * (photo, title, badges, description, four spec rows, amenities, price, buttons), so the list does not jump.
 * Cards that show extra messages, such as sold-out suggestions, are a little taller.
 */
export function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="rounded-card border-line bg-card flex h-full flex-col overflow-hidden border"
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-h-[2.6em] space-y-2">
          <Skeleton className="h-5 w-3/4 rounded" />
        </div>
        <div className="flex min-h-7 gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <div className="min-h-12 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-1/2 rounded" />
          ))}
        </div>
        <div className="min-h-[3.25rem] space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/5 rounded" />
        </div>
        <div className="mt-auto space-y-4 pt-2">
          <div className="min-h-[5.5rem] space-y-2">
            <Skeleton className="h-7 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="rounded-control h-11 flex-1" />
            <Skeleton className="rounded-control h-11 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
