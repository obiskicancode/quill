import { getHighlights } from '@/lib/content/data'
import type { PreviewFlags } from '@/lib/content/preview'

/** Year established and number of rooms. Each figure shows only when it exists. */
export async function HighlightsStrip({ flags }: { flags: PreviewFlags }) {
  const { year, rooms } = await getHighlights(flags)
  const items = [
    year ? { label: 'Established', value: String(year) } : null,
    rooms ? { label: rooms === 1 ? 'Room type' : 'Room types', value: String(rooms) } : null,
  ].filter((x): x is { label: string; value: string } => x !== null)
  if (items.length === 0) return null
  return (
    <section aria-label="Highlights" className="on-dark bg-ink py-10 text-paper">
      <dl className="container-page flex flex-wrap justify-center gap-x-16 gap-y-6 text-center">
        {items.map((i) => (
          <div key={i.label}>
            <dd className="font-display text-display">{i.value}</dd>
            <dt className="text-small text-paper/80">{i.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
