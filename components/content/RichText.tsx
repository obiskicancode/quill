import type { RichBlock } from '@/lib/content/types'

/** Renders the admin's rich text as plain elements (paragraphs, sub-headings, lists). Longer or shorter text both fit. */
export function RichText({ blocks }: { blocks: RichBlock[] }) {
  return (
    <div className="space-y-4 text-body-lg leading-[1.7] text-ink/90">
      {blocks.map((b, i) =>
        b.type === 'h3' ? <h3 key={i} className="pt-2 font-display text-h3 text-ink">{b.text}</h3>
        : b.type === 'ul' ? <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
        : <p key={i}>{b.text}</p>,
      )}
    </div>
  )
}
