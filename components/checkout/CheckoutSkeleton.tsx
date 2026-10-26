import { BreakdownSkeleton } from '../room-detail/PriceBreakdown';

const bar = 'rounded bg-ink/10 motion-safe:animate-pulse';

/** Same grid and block heights as the loaded page, so nothing moves when the quote arrives. */
export function CheckoutSkeleton() {
  return (
    <div aria-busy="true" className="container-page py-8 md:py-12">
      <p className="sr-only" role="status">
        Loading your booking
      </p>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12">
        <div aria-hidden className="space-y-8">
          <div className={`${bar} h-8 w-2/3`} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className={`${bar} h-4 w-28`} />
              <div className={`${bar} rounded-control h-12 w-full`} />
            </div>
          ))}
          <div className={`${bar} rounded-card h-40 w-full`} />
        </div>
        <div
          aria-hidden
          className="rounded-card border-line bg-card mt-8 hidden space-y-5 border p-5 lg:mt-0 lg:block"
        >
          <div className="flex gap-4">
            <div className={`${bar} rounded-control size-20`} />
            <div className="flex-1 space-y-2">
              <div className={`${bar} h-6 w-3/4`} />
              <div className={`${bar} h-4 w-1/2`} />
            </div>
          </div>
          <BreakdownSkeleton />
        </div>
      </div>
    </div>
  );
}
