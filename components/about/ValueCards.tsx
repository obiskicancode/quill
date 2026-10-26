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

export async function ValueCards() {
  const cards = await getValueCards();
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="values-title" className="section-y bg-surface">
      <div className="container-page">
        <h2 id="values-title" className="font-display text-h2 mb-10">
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
                className="rounded-card border-line bg-paper border p-6"
              >
                <span className="bg-accent text-ink grid size-12 place-items-center rounded-full">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="font-display text-h3 mt-4">{c.title}</h3>
                <p className="text-small text-ink/85 mt-2">{c.text}</p>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
