import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';
import { TextLink } from '@/components/ui/text-link';
import { getAttractions, getPublishedSitePage } from '@/lib/content/data';

/** Short text about the area, a list of nearby attractions and a link to Contact. Omitted when there is nothing to say. */
export async function SurroundingsSection() {
  const [attractions, page] = await Promise.all([
    getAttractions(),
    getPublishedSitePage('about'),
  ]);
  const text = page?.content.surroundingsText ?? '';
  if (!text && attractions.length === 0) return null;
  return (
    <section aria-labelledby="area-title" className="bg-card section-y">
      <div className="container-page grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="area-title" className="font-display text-h2">
            Location and surroundings
          </h2>
          {text && (
            <p className="mt-4 text-body-lg leading-prose text-ink/90">
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
                className="rounded-card border border-line bg-paper p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="text-small font-semibold text-brand-ink">
                    {a.distanceNote}
                  </p>
                </div>
                <p className="mt-1 text-small text-ink/85">{a.description}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}
