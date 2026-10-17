const bar = 'rounded bg-ink/10 motion-safe:animate-pulse'

type Variant = 'text-image' | 'cards' | 'grid' | 'list' | 'form' | 'strip'

/** Loading placeholders that reserve about the same height as the real section, so nothing jumps. */
export function SectionSkeleton({ variant, label = 'Loading' }: { variant: Variant; label?: string }) {
  return (
    <section aria-busy="true" className="section-y">
      <p role="status" className="sr-only">{label}</p>
      <div aria-hidden className="container-page">
        <div className={`${bar} mb-8 h-9 w-64`} />
        {variant === 'text-image' && (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${bar} h-4 w-full`} />)}</div>
            <div className={`${bar} aspect-[4/3] rounded-card`} />
          </div>
        )}
        {variant === 'cards' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-40 rounded-card`} />)}</div>
        )}
        {variant === 'grid' && (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {[1.5, 1, 0.7, 1.2, 1, 1.4, 0.8, 1.1].map((r, i) => <div key={i} className={`${bar} mb-3 w-full rounded-card`} style={{ aspectRatio: String(1 / r) }} />)}
          </div>
        )}
        {variant === 'list' && <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className={`${bar} h-16 w-full rounded-card`} />)}</div>}
        {variant === 'form' && <div className={`${bar} h-96 w-full rounded-card`} />}
        {variant === 'strip' && <div className={`${bar} h-24 w-full rounded-card`} />}
      </div>
    </section>
  )
}
