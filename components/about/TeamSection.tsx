import { HoverZoom, StaggerGroup, StaggerItem } from '@/components/motion';
import { getTeam } from '@/lib/content/data';

import { Photo } from '../ui/Photo';

/** Photo, name, role and a short bio. Omitted when no team members are published. */
export async function TeamSection() {
  const team = await getTeam();
  if (team.length === 0) return null;
  return (
    <section aria-labelledby="team-title" className="section-y">
      <div className="container-page">
        <h2 id="team-title" className="mb-10 font-display text-h2">
          The people who look after you
        </h2>
        <StaggerGroup
          as="ul"
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {team.map((m) => (
            <StaggerItem key={m.id} as="li" scale className="group/media">
              {m.photo ? (
                <HoverZoom className="aspect-[4/5] w-full rounded-card">
                  <Photo
                    src={m.photo.src}
                    alt={m.photo.alt}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="h-full w-full"
                  />
                </HoverZoom>
              ) : (
                <div
                  aria-hidden
                  className="grid aspect-[4/5] w-full place-items-center rounded-card bg-ink/10 font-display text-display text-ink/40"
                >
                  {m.name.replace(/[^A-Za-z]/g, '').slice(0, 1) || '·'}
                </div>
              )}
              <h3 className="mt-4 font-display text-h3">{m.name}</h3>
              <p className="text-small font-semibold text-accent-ink">
                {m.role}
              </p>
              <p className="mt-2 text-small text-ink/85">{m.bio}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
