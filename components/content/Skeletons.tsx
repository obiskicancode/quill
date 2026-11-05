import { Skeleton } from '@/components/ui/skeleton';

type Variant = 'text-image' | 'cards' | 'grid' | 'list' | 'form' | 'strip';

/** Loading placeholders that reserve about the same height as the real section, so nothing jumps. */
export function SectionSkeleton({
  variant,
  label = 'Loading',
}: {
  variant: Variant;
  label?: string;
}) {
  return (
    <section aria-busy="true" className="section-y">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden className="container-page">
        <Skeleton className="mb-8 h-9 w-64 rounded-control" />
        {variant === 'text-image' && (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded-sm" />
              ))}
            </div>
            <Skeleton className="aspect-[4/3] rounded-card" />
          </div>
        )}
        {variant === 'cards' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-card" />
            ))}
          </div>
        )}
        {variant === 'grid' && (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {[1.5, 1, 0.7, 1.2, 1, 1.4, 0.8, 1.1].map((r, i) => (
              <Skeleton
                key={i}
                className="mb-3 w-full rounded-card"
                style={{ aspectRatio: String(1 / r) }}
              />
            ))}
          </div>
        )}
        {variant === 'list' && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-card" />
            ))}
          </div>
        )}
        {variant === 'form' && (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64 rounded-sm" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-20 rounded-control" />
              <Skeleton className="h-20 rounded-control" />
            </div>
            <Skeleton className="h-20 rounded-control" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-20 rounded-control" />
              <Skeleton className="h-20 rounded-control" />
            </div>
            <Skeleton className="h-14 rounded-control" />
            <Skeleton className="h-32 rounded-control" />
            <Skeleton className="h-6 w-64 rounded-sm" />
            <Skeleton className="h-12 w-40 rounded-control" />
          </div>
        )}
        {variant === 'strip' && (
          <Skeleton className="h-24 w-full rounded-card" />
        )}
      </div>
    </section>
  );
}
