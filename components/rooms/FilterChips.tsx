'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { formatNaira } from '@/lib/format';
import {
  bedTypeLabels,
  filterAmenityOptions,
  type FilterAmenity,
  type RoomFilters,
} from '@/lib/rooms';

import { spring } from '../motion/variants';

interface Chip {
  id: string;
  label: string;
  remove: (f: RoomFilters) => RoomFilters;
}

function buildChips(f: RoomFilters): Chip[] {
  const chips: Chip[] = [];
  if (f.minPrice !== null || f.maxPrice !== null) {
    const label =
      f.minPrice !== null && f.maxPrice !== null
        ? `${formatNaira(f.minPrice)} to ${formatNaira(f.maxPrice)}`
        : f.minPrice !== null
          ? `From ${formatNaira(f.minPrice)}`
          : `Up to ${formatNaira(f.maxPrice as number)}`;
    chips.push({
      id: 'price',
      label,
      remove: (x) => ({ ...x, minPrice: null, maxPrice: null }),
    });
  }
  if (f.minGuests !== null) {
    chips.push({
      id: 'guests',
      label: `${f.minGuests}+ guests`,
      remove: (x) => ({ ...x, minGuests: null }),
    });
  }
  for (const bed of f.beds) {
    chips.push({
      id: `bed-${bed}`,
      label: bedTypeLabels[bed],
      remove: (x) => ({ ...x, beds: x.beds.filter((b) => b !== bed) }),
    });
  }
  for (const key of f.amenities) {
    const label = filterAmenityOptions.find((o) => o.key === key)?.label ?? key;
    chips.push({
      id: `amenity-${key}`,
      label,
      remove: (x) => ({
        ...x,
        amenities: x.amenities.filter((a) => a !== (key as FilterAmenity)),
      }),
    });
  }
  return chips;
}

export function FilterChips({
  filters,
  onChange,
  onClearAll,
}: {
  filters: RoomFilters;
  onChange: (next: RoomFilters) => void;
  onClearAll: () => void;
}) {
  const chips = buildChips(filters);
  const reduced = useReducedMotion();
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2"
    >
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.li
            key={chip.id}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.85 }}
            transition={spring}
          >
            <button
              type="button"
              onClick={() => onChange(chip.remove(filters))}
              aria-label={`Remove filter: ${chip.label}`}
              className="border-ink/60 bg-surface text-small hover:bg-ink hover:text-paper inline-flex min-h-11 items-center gap-2 rounded-full border pr-3 pl-4 font-medium transition-colors"
            >
              {chip.label}
              <X className="size-4" aria-hidden />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="text-small decoration-accent inline-flex min-h-11 items-center px-3 font-semibold underline decoration-2 underline-offset-4"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
