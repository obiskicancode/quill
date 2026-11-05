import { formatGuestStamp } from '@/lib/dates';
import type { TimelineEntry } from '@/types/manage.types';

import { StaggerGroup, StaggerItem } from '../motion';

/** The booking's history in plain language, newest first. */
export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <section
      aria-labelledby="activity-title"
      className="rounded-card border border-line bg-card p-5 shadow-raised md:p-6 print:hidden"
    >
      <h2 id="activity-title" className="font-display text-h3">
        Activity
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-small text-muted-foreground">
          Nothing has happened on this booking yet.
        </p>
      ) : (
        <StaggerGroup
          as="ol"
          staggerChildren={0.06}
          className="mt-5 space-y-5 border-l-2 border-line pl-5"
        >
          {entries.map((e) => (
            <StaggerItem key={e.id} as="li" className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-ink bg-card"
              />
              <p className="font-semibold">{e.label}</p>
              {e.detail && <p className="text-small text-ink/85">{e.detail}</p>}
              <p className="text-caption text-muted-foreground">
                <time dateTime={e.at}>{formatGuestStamp(e.at)}</time>
              </p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </section>
  );
}
