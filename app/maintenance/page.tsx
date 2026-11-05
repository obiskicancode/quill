import { Wrench } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { getPublicSite } from '@/lib/content/data';
import { telHref, whatsappHref } from '@/lib/site';

export const metadata = {
  title: 'Maintenance',
  robots: { index: false, follow: false },
};

/** Returns HTTP 503 when served through middleware. */
export default async function MaintenancePage() {
  // This page is the fallback when the rest of the site is switched off, so a
  // settings read that fails costs the contact routes and nothing else.
  const site = await getPublicSite().catch(() => null);

  return (
    <section aria-labelledby="maint-title" className="container-page section-y">
      <div className="max-w-xl space-y-5">
        <Wrench className="size-10 text-brand-ink" aria-hidden />
        <h1 id="maint-title" className="font-display text-h2">
          We are making a few updates
        </h1>
        <p className="text-body-lg text-ink/85">
          Our website is down for scheduled maintenance. We will be back online
          soon. Thanks for your patience.
        </p>
        {site ? (
          <>
            <p className="text-small text-muted-foreground">
              Need to book right now? Reach us on any of these and we can help
              you straight away.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={whatsappHref(site)} variant="whatsapp" external>
                Chat on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </ButtonLink>
              {site.contact.phoneTel && (
                <ButtonLink href={telHref(site)} variant="secondary">
                  Call {site.contact.phoneDisplay}
                </ButtonLink>
              )}
              {site.contact.email && (
                <ButtonLink
                  href={`mailto:${site.contact.email}`}
                  variant="secondary"
                >
                  Email us
                </ButtonLink>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
