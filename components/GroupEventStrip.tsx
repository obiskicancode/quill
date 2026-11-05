import { getPublicSite } from '@/lib/content/data';

import { ButtonLink } from './ui/button';

export async function GroupEventStrip() {
  const site = await getPublicSite();
  return (
    <section aria-labelledby="group-heading" className="section-y pb-0">
      <div className="container-page">
        <div className="on-dark flex flex-col items-start justify-between gap-6 rounded-card bg-ink p-8 text-paper md:flex-row md:items-center md:p-10">
          <div className="max-w-xl">
            <h2
              id="group-heading"
              className="font-display text-h2 text-balance"
            >
              Booking for a group or an event?
            </h2>
            <p className="mt-3 text-body-lg text-paper/85">
              Conferences, weddings and team trips. Send us your dates and
              numbers and {site.shortName} will come back with a quote.
            </p>
          </div>
          <ButtonLink href="/contact?topic=group#enquiry" size="lg">
            Send a group enquiry
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
