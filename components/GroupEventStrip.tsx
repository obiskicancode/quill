import { getPublicSite } from '@/lib/content/data';

import { ButtonLink } from './ui/button';

export async function GroupEventStrip() {
  const site = await getPublicSite();
  return (
    <section aria-labelledby="group-heading" className="section-y pb-0">
      <div className="container-page">
        <div className="on-dark rounded-card bg-ink text-paper flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-10">
          <div className="max-w-xl">
            <h2
              id="group-heading"
              className="font-display text-h2 text-balance"
            >
              Booking for a group or an event?
            </h2>
            <p className="text-body-lg text-paper/85 mt-3">
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
