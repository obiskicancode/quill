import { ButtonLink } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';

export default function RoomNotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <PageHeading id="nf-title" className="font-display text-h2">
        We couldn&rsquo;t find that room
      </PageHeading>
      <p className="mt-3 max-w-lg text-body-lg text-ink/85">
        It may have been renamed or is no longer available. Browse our rooms and
        apartments to find one that suits your stay.
      </p>
      <div className="mt-8">
        <ButtonLink href="/rooms" size="lg">
          Back to Rooms
        </ButtonLink>
      </div>
    </section>
  );
}
