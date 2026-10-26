/**
 * Placeholder with the same structure and minimum heights as the listing card
 * (photo, title, badges, description, four spec rows, amenities, price, buttons), so the list does not jump.
 * Cards that show extra messages, such as sold-out suggestions, are a little taller.
 */
export function SkeletonCard() {
  const bar = 'rounded bg-ink/10 motion-safe:animate-pulse';
  return (
    <div
      aria-hidden
      className="rounded-card border-line bg-surface flex h-full flex-col overflow-hidden border"
    >
      <div className="bg-ink/10 aspect-[4/3] w-full motion-safe:animate-pulse" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-h-[2.6em] space-y-2">
          <div className={`${bar} h-5 w-3/4`} />
        </div>
        <div className="flex min-h-7 gap-2">
          <div className={`${bar} h-7 w-24 rounded-full`} />
          <div className={`${bar} h-7 w-32 rounded-full`} />
        </div>
        <div className="min-h-12 space-y-2">
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-2/3`} />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${bar} h-4 w-1/2`} />
          ))}
        </div>
        <div className="min-h-[3.25rem] space-y-2">
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-3/5`} />
        </div>
        <div className="mt-auto space-y-4 pt-2">
          <div className="min-h-[5.5rem] space-y-2">
            <div className={`${bar} h-7 w-2/3`} />
            <div className={`${bar} h-4 w-1/2`} />
          </div>
          <div className="flex gap-3">
            <div className={`${bar} rounded-control h-11 flex-1`} />
            <div className={`${bar} rounded-control h-11 flex-1`} />
          </div>
        </div>
      </div>
    </div>
  );
}
