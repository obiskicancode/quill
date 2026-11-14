import { ButtonLink } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { TextLink } from '@/components/ui/text-link';

export function PageNotPublished() {
  return (
    <section
      aria-labelledby="page-unpublished-title"
      className="container-page section-y"
    >
      <div className="max-w-xl">
        <PageHeading
          id="page-unpublished-title"
          className="font-display text-h2"
        >
          This page isn&rsquo;t published yet
        </PageHeading>
        <p className="mt-3 text-body-lg text-ink/85">
          We&rsquo;re still preparing this page. Please check back soon.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary">
            Browse rooms
          </ButtonLink>
        </div>
        <p className="mt-6 text-small text-muted-foreground">
          Looking for something specific?{' '}
          <TextLink href="/contact">Contact us</TextLink>.
        </p>
      </div>
    </section>
  );
}
