import { MessageCircle } from 'lucide-react'
import { site, whatsappHref } from '@/lib/site'
import { HeroVideo } from './HeroVideo'
import { ButtonLink } from './ui/Button'
import { Photo } from './ui/Photo'

/** Full-width hero. The photo is the poster for the optional video; a dark gradient keeps the text above 4.5:1 on any image. */
export function Hero() {
  const { headline, subheadline, image, video } = site.hero
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative isolate flex min-h-[34rem] items-end overflow-hidden bg-ink text-white md:min-h-[40rem] xl:min-h-[44rem]"
    >
      <div className="absolute inset-0 z-0">
        <Photo src={image.src} alt={image.alt} sizes="100vw" priority className="h-full w-full" />
      </div>
      {video && <HeroVideo src={video.src} type={video.type} />}
      <div aria-hidden className="absolute inset-0 z-[2] bg-gradient-to-t from-ink/90 via-ink/60 to-ink/50" />

      <div className="container-page relative z-10 pb-24 pt-32 md:pb-32">
        <h1 id="hero-heading" className="max-w-3xl font-display text-display text-balance">
          {headline}
        </h1>
        <p className="mt-5 max-w-xl text-body-lg text-white/90">{subheadline}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={site.bookingHref} size="lg">
            Book Now
          </ButtonLink>
          <ButtonLink
            href={whatsappHref()}
            external
            variant="secondaryOnDark"
            size="lg"
            icon={<MessageCircle className="size-5" aria-hidden />}
          >
            Chat on WhatsApp
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
