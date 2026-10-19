import {
  Bed,
  Clock,
  Heart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { StaggerGroup, StaggerItem } from '@/components/motion';
import { getValueCards } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';
import type { ValueIcon } from '@/types/content.types';

const icons: Record<ValueIcon, LucideIcon> = {
  bed: Bed,
  shield: ShieldCheck,
  power: Zap,
  heart: Heart,
  clock: Clock,
  map: MapPin,
  users: Users,
  sparkles: Sparkles,
};

export async function ValueCards({ flags }: { flags: PreviewFlags }) {
  const cards = await getValueCards(flags);
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="values-title" className="section-y bg-surface">
      <div className="container-page">
        <h2 id="values-title" className="mb-10 font-display text-h2">
          What to expect
        </h2>
        <StaggerGroup
          as="ul"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {cards.map((c) => {
            const Icon = icons[c.icon] ?? Sparkles;
            return (
              <StaggerItem
                key={c.title}
                as="li"
                scale
                className="rounded-card border border-line bg-paper p-6"
              >
                <span className="grid size-12 place-items-center rounded-full bg-accent text-ink">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-h3">{c.title}</h3>
                <p className="mt-2 text-small text-ink/85">{c.text}</p>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
