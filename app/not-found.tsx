import { ButtonLink } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { TextLink } from '@/components/ui/text-link';

/** Global 404. Rendered inside the root layout, so the header and footer stay in place. */
export default function NotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <div className="max-w-xl">
        <p
          aria-hidden
          className="font-display text-display leading-none text-brand-ink"
        >
          404
        </p>
        <PageHeading id="nf-title" className="mt-2 font-display text-h2">
          This page has checked out
        </PageHeading>
        <p className="mt-3 text-body-lg text-ink/85">
          The page you were looking for may have moved or no longer exists.
          Let&rsquo;s get you back on track.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary">
            Browse rooms
          </ButtonLink>
        </div>
        <p className="mt-6 text-small text-muted-foreground">
          Looking for something specific?{' '}
          <TextLink href="/enquiry">Send us a booking enquiry</TextLink>.
        </p>
      </div>
    </section>
  );
}
