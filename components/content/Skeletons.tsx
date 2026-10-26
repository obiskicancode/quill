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
        <Skeleton className="rounded-control mb-8 h-9 w-64" />
        {variant === 'text-image' && (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded" />
              ))}
            </div>
            <Skeleton className="rounded-card aspect-[4/3]" />
          </div>
        )}
        {variant === 'cards' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="rounded-card h-40" />
            ))}
          </div>
        )}
        {variant === 'grid' && (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {[1.5, 1, 0.7, 1.2, 1, 1.4, 0.8, 1.1].map((r, i) => (
              <Skeleton
                key={i}
                className="rounded-card mb-3 w-full"
                style={{ aspectRatio: String(1 / r) }}
              />
            ))}
          </div>
        )}
        {variant === 'list' && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="rounded-card h-16 w-full" />
            ))}
          </div>
        )}
        {variant === 'form' && (
          <Skeleton className="rounded-card h-96 w-full" />
        )}
        {variant === 'strip' && (
          <Skeleton className="rounded-card h-24 w-full" />
        )}
      </div>
    </section>
  );
}
