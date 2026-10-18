import { getAboutPage } from '@/lib/content/data'
import type { PreviewFlags } from '@/lib/content/preview'
import type { RichBlock } from '@/types/content.types'
import { HoverZoom, Reveal } from '@/components/motion'
import { Photo } from '../ui/Photo'
import { RichText } from '../content/RichText'

/** Splits the body at a sub-heading near the middle, so two images can sit beside two stretches of text. */
function split(blocks: RichBlock[], parts: number): RichBlock[][] {
  if (parts <= 1) return [blocks]
  const heads = blocks.map((b, i) => (b.type === 'h3' ? i : -1)).filter((i) => i > 0)
  const cut = heads.length ? heads[Math.floor(heads.length / 2)] ?? heads[0] : Math.ceil(blocks.length / 2)
  return [blocks.slice(0, cut), blocks.slice(cut)].filter((p) => p.length > 0)
}

export async function StorySection({ flags }: { flags: PreviewFlags }) {
  const page = await getAboutPage(flags)
  if (page.body.length === 0) return null // no story yet: the section is omitted
  const images = page.content.images.slice(0, 2)
  const chunks = split(page.body, Math.max(1, images.length))

  return (
    <section aria-label="Our story" className="section-y">
      <div className="container-page space-y-14 md:space-y-20">
        {chunks.map((chunk, i) => {
          const image = images[i]
          return (
            <Reveal key={i} delay={i * 0.08} className={`group/media grid items-center gap-8 md:gap-12 ${image ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
              <div className={i % 2 === 1 ? 'md:order-2' : ''}><RichText blocks={chunk} /></div>
              {image && (
                <HoverZoom className={`aspect-[4/3] w-full rounded-card ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <Photo src={image.src} alt={image.alt} sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full" />
                </HoverZoom>
              )}
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
