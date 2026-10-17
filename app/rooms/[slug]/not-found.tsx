import { Reveal, TextReveal } from '@/components/motion'
import { ButtonLink } from '@/components/ui/Button'

export default function RoomNotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <TextReveal as="h1" id="nf-title" text="We couldn’t find that room" className="font-display text-h2" onScroll={false} />
      <Reveal delay={0.12}>
        <p className="mt-3 max-w-lg text-body-lg text-ink/85">
          It may have been renamed or is no longer available. Browse our rooms and apartments to find one that suits your stay.
        </p>
      </Reveal>
      <Reveal delay={0.2} className="mt-8">
        <ButtonLink href="/rooms" size="lg">Back to Rooms</ButtonLink>
      </Reveal>
    </section>
  )
}
