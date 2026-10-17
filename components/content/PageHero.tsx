import { Breadcrumb, type Crumb } from '../Breadcrumb'
import { Photo } from '../ui/Photo'

interface PageHeroProps {
  crumbs: Crumb[]
  title: string
  intro: string
  image: { src: string; alt: string }
}

/** Shared page opening: breadcrumb, H1, one-line intro and a compact image hero. The image is the page's LCP. */
export function PageHero({ crumbs, title, intro, image }: PageHeroProps) {
  return (
    <section aria-labelledby="page-title" className="on-dark relative isolate flex min-h-[15rem] items-end overflow-hidden bg-ink text-white md:min-h-[19rem]">
      <div className="absolute inset-0 z-0">
        <Photo src={image.src} alt="" sizes="100vw" priority className="h-full w-full" />
      </div>
      <div aria-hidden className="absolute inset-0 z-[1] bg-gradient-to-t from-ink/90 via-ink/65 to-ink/55" />
      <div className="container-page relative z-10 py-8 md:py-12">
        <Breadcrumb tone="dark" items={crumbs} />
        <h1 id="page-title" className="mt-2 max-w-3xl font-display text-h2 text-balance md:text-display">{title}</h1>
        <p className="mt-3 max-w-xl text-body-lg text-white/90">{intro}</p>
      </div>
    </section>
  )
}
