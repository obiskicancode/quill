import { StaggerGroup, StaggerItem, TextReveal } from '@/components/motion';
import { unitLabels } from '@/lib/checkout/format';
import { getExtras } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';
import { formatMinor } from '@/types/stay.types';

/** The hotel's active paid extras. Prices come as kobo and are shown in naira. */
export async function ExtrasCards({ flags }: { flags: PreviewFlags }) {
  const extras = await getExtras(flags);
  if (extras.length === 0) return null;
  return (
    <section aria-labelledby="extras-title" className="section-y">
      <div className="container-page">
        <TextReveal
          as="h2"
          id="extras-title"
          text="Paid extras"
          className="font-display text-h2"
        />
        <p className="mt-3 max-w-2xl text-body-lg text-ink/85">
          Add these while you book. Prices are shown before you pay.
        </p>
        <StaggerGroup
          as="ul"
          staggerChildren={0.06}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {extras.map((e) => (
            <StaggerItem
              key={e.id}
              as="li"
              scale
              className="flex flex-col rounded-card border border-line bg-surface p-6"
            >
              <h3 className="font-display text-h3">{e.name}</h3>
              <p className="mt-2 flex-1 text-small text-ink/85">
                {e.description}
              </p>
              <p className="mt-4">
                <span className="font-display text-2xl tabular-nums">
                  {formatMinor(e.priceMinor)}
                </span>
                <span className="text-small text-muted">
                  {' '}
                  {unitLabels[e.unit]}
                </span>
              </p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
