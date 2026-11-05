import { CalendarSearch, MessageCircle } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';

import { ButtonLink } from '../ui/button';

interface EnquirySectionProps {
  whatsappHref: string;
  /** A booking reference from ?ref= to include in the intro. */
  refCode: string | null;
}

/** The intro above the booking enquiry form. It has a single WhatsApp shortcut and can mention a booking reference. */
export function EnquirySection({ whatsappHref, refCode }: EnquirySectionProps) {
  return (
    <section aria-labelledby="enquiry-intro-title" className="section-y">
      <div className="container-page max-w-3xl">
        <div>
          <p className="text-small font-semibold tracking-wide text-brand-ink uppercase">
            Booking enquiries
          </p>
          <h2 id="enquiry-intro-title" className="mt-2 font-display text-h2">
            Need help with a booking?
          </h2>
          <p className="mt-3 max-w-3xl text-body-lg text-ink/85">
            Ask us about dates, rooms, a group booking or anything else before
            you pay. If you already have a booking, tell us its reference
            {refCode ? (
              <span className="font-semibold"> {refCode}</span>
            ) : (
              ''
            )}{' '}
            and we will sort it for you.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={whatsappHref}
              variant="whatsapp"
              icon={<MessageCircle className="size-5" aria-hidden />}
            >
              Chat on WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
            <ButtonLink
              href="/rooms"
              variant="secondary"
              icon={<CalendarSearch className="size-5" aria-hidden />}
            >
              Check room availability
            </ButtonLink>
          </div>
          <p className="mt-3 text-small text-muted-foreground">
            Want to send a general question instead?{' '}
            <TextLink href="/contact">Go to the contact page</TextLink>.
          </p>
        </div>
      </div>
    </section>
  );
}
