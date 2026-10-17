import { Reveal, TextReveal } from '@/components/motion'
import { ButtonLink } from '@/components/ui/Button'

/** Global 404. Rendered inside the root layout, so the header and footer stay in place. */
export default function NotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <div className="max-w-xl">
        <p aria-hidden className="font-display text-display leading-none text-accent-ink">404</p>
        <TextReveal as="h1" id="nf-title" text="This page has checked out" className="mt-2 font-display text-h2" onScroll={false} />
        <Reveal delay={0.12}>
          <p className="mt-3 text-body-lg text-ink/85">
            The page you were looking for may have moved or no longer exists. Let&rsquo;s get you back on track.
          </p>
        </Reveal>
        <Reveal delay={0.2} className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/" size="lg">Back to home</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary" size="lg">Browse rooms</ButtonLink>
        </Reveal>
      </div>
    </section>
  )
}
