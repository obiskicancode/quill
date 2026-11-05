'use client';

import { useScrollSpy } from '@/hooks/use-scroll-spy';

import { Chip } from '../ui/chip';

interface Item {
  id: string;
  slug: string;
  name: string;
}

/** Sticky horizontal chip nav with an active chip that follows the reader as they scroll the facilities list. */
export function FacilitiesNav({ items }: { items: Item[] }) {
  const active = useScrollSpy(items.map((i) => `facility-${i.slug}`));

  return (
    <nav
      aria-label="Jump to a facility"
      className="sticky top-(--header-h) z-(--z-sticky) -mx-5 mb-10 border-b border-line bg-paper/95 px-5 py-2 backdrop-blur md:-mx-8 md:px-8 lg:top-(--header-h-lg) xl:-mx-10 xl:px-10"
    >
      <ul className="scrollbar-hidden flex gap-2 overflow-x-auto py-1">
        {items.map((f) => {
          const isActive = active === `facility-${f.slug}`;
          return (
            <li key={f.id} className="shrink-0">
              <Chip
                href={`#facility-${f.slug}`}
                aria-current={isActive ? 'true' : undefined}
                state={isActive ? 'active' : 'idle'}
              >
                {f.name}
              </Chip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
