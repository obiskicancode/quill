import { MessageCircle } from 'lucide-react'
import { site, whatsappHref } from '@/lib/site'
import { ButtonLink } from './ui/Button'

export function CtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="bg-accent py-14 text-ink md:py-20">
      <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 id="cta-heading" className="font-display text-h2 text-balance">{site.cta.heading}</h2>
          <p className="mt-3 text-body-lg">{site.cta.text}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <ButtonLink href={site.bookingHref} variant="dark" size="lg">Book Now</ButtonLink>
          <ButtonLink href={whatsappHref()} external variant="secondary" size="lg" icon={<MessageCircle className="size-5" aria-hidden />}>
            Chat on WhatsApp
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
