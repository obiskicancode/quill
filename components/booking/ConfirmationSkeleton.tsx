const bar = 'rounded bg-ink/10 motion-safe:animate-pulse'

/** Same blocks and heights as the loaded page, so nothing moves when the booking arrives. */
export function ConfirmationSkeleton() {
  return (
    <div aria-busy="true" className="container-page max-w-5xl space-y-6 py-8 md:py-12">
      <p role="status" className="sr-only">Loading your booking</p>
      <div aria-hidden className="space-y-6">
        <div className="space-y-4 rounded-card border border-line bg-surface p-8">
          <div className="flex gap-4"><div className={`${bar} size-14 rounded-full`} /><div className="flex-1 space-y-3"><div className={`${bar} h-8 w-2/3`} /><div className={`${bar} h-4 w-full`} /></div></div>
          <div className={`${bar} h-10 w-48`} />
        </div>
        <div className={`${bar} h-6 w-3/4`} />
        <div className="flex flex-wrap gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-12 w-44 rounded-control`} />)}</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={`${bar} h-96 rounded-card`} />
          <div className={`${bar} h-96 rounded-card`} />
        </div>
        <div className={`${bar} h-56 rounded-card`} />
      </div>
    </div>
  )
}
