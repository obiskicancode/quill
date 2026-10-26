import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';
import { getAttractions, getSitePage } from '@/lib/content/data';

import { TextLink } from '../ui/TextLink';

/** Short text about the area, a list of nearby attractions and a link to Contact. Omitted when there is nothing to say. */
export async function SurroundingsSection() {
  const attractions = await getAttractions();
  const text = (await getSitePage('about')).content.surroundingsText ?? '';
  if (!text && attractions.length === 0) return null;
  return (
    <section aria-labelledby="area-title" className="section-y bg-surface">
      <div className="container-page grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="area-title" className="font-display text-h2">
            Location and surroundings
          </h2>
          {text && (
            <p className="text-body-lg text-ink/90 mt-4 leading-[1.7]">
              {text}
            </p>
          )}
          <div className="mt-4">
            <TextLink href="/contact">See the map and how to get here</TextLink>
          </div>
        </Reveal>
        {attractions.length > 0 && (
          <StaggerGroup
            as="ul"
            staggerChildren={0.06}
            className="grid gap-4 lg:col-span-7"
          >
            {attractions.map((a) => (
              <StaggerItem
                key={a.id}
                as="li"
                className="rounded-card border-line bg-paper border p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="text-small text-accent-ink font-semibold">
                    {a.distanceNote}
                  </p>
                </div>
                <p className="text-small text-ink/85 mt-1">{a.description}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}
