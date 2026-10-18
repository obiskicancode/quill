import { Wrench } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Maintenance', robots: { index: false, follow: false } }

/** Returns HTTP 503 when served through middleware. */
export default function MaintenancePage() {
  return (
    <section aria-labelledby="maint-title" className="container-page section-y">
      <div className="max-w-xl space-y-5">
        <Wrench className="size-10 text-accent-ink" aria-hidden />
        <h1 id="maint-title" className="font-display text-h2">
          We are making a few updates
        </h1>
        <p className="text-body-lg text-ink/85">
          Our website is down for scheduled maintenance. We will be back online soon. Thanks for your patience.
        </p>
        <p className="text-small text-muted">
          Want to make a booking now? Message us on WhatsApp and we can help you straight away.
        </p>
        <div>
          <ButtonLink href="https://wa.me/" variant="whatsapp" external>
            Chat on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
