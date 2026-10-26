import { Reveal, TextReveal } from '@/components/motion';
import { getEventFacilities } from '@/lib/content/data';

import { ButtonLink } from '../ui/button';

/** Conference and events: capacity, layouts and an Enquire button. Shown only when such a facility exists. */
export async function EventsStrip() {
  const items = await getEventFacilities();
  if (items.length === 0) return null;
  const capacity = items.map((i) => i.capacity).find(Boolean);
  const layouts = [...new Set(items.flatMap((i) => i.layouts))];
  return (
    <section
      aria-labelledby="events-title"
      className="on-dark bg-ink text-paper py-14 md:py-20"
    >
      <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <Reveal className="max-w-xl">
          <TextReveal
            as="h2"
            id="events-title"
            text="Meetings, conferences and events"
            className="font-display text-h2 text-balance"
          />
          <dl className="text-body-lg text-paper/90 mt-4 space-y-2">
            {capacity && (
              <div className="flex gap-2">
                <dt className="font-semibold">Capacity:</dt>
                <dd>{capacity}</dd>
              </div>
            )}
            {layouts.length > 0 && (
              <div className="flex gap-2">
                <dt className="font-semibold">Layouts:</dt>
                <dd>{layouts.join(', ')}</dd>
              </div>
            )}
          </dl>
        </Reveal>
        <Reveal delay={0.1}>
          <ButtonLink href="/contact?topic=event_conference" size="lg">
            Enquire about an event
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
