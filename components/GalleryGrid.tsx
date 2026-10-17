import type { ImageAsset } from '@/lib/types'
import { Photo } from './ui/Photo'
import { SectionHeading } from './ui/SectionHeading'
import { TextLink } from './ui/TextLink'

// Spans for six tiles: one large, one tall, two wide, two single. Row heights are fixed, so there is no layout shift.
const SPANS = ['col-span-2 row-span-2', '', 'row-span-2', '', 'col-span-2', 'col-span-2']

export function GalleryGrid({ images }: { images: ImageAsset[] }) {
  const tiles = images.slice(0, 6)
  if (tiles.length === 0) return null
  const asymmetric = tiles.length === 6

  return (
    <section aria-labelledby="gallery-heading" className="section-y">
      <div className="container-page">
        <SectionHeading
          id="gallery-heading"
          title="A look around"
          action={<TextLink href="/gallery">View full gallery</TextLink>}
        />
        <div
          className={`grid grid-flow-dense grid-cols-2 gap-3 md:gap-4 ${
            asymmetric ? 'auto-rows-[9.5rem] md:grid-cols-4 md:auto-rows-[13rem]' : 'md:grid-cols-3'
          }`}
        >
          {tiles.map((img, i) => {
            const span = asymmetric ? SPANS[i] : ''
            const large = span.includes('col-span-2')
            return (
              <div key={img.src} className={span}>
                <Photo
                  src={img.src}
                  alt={img.alt}
                  sizes={large ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                  className={`w-full rounded-card ${asymmetric ? 'h-full' : 'aspect-[4/3]'}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
