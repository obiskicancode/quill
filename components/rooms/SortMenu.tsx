'use client';

import { ChevronDown } from 'lucide-react';
import { useId } from 'react';

import { sortOptions, type SortKey } from '@/lib/rooms';

/** A native select: best keyboard, screen reader and mobile behaviour for free. */
export function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-small font-semibold">
        Sort by
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as SortKey)}
          className="min-h-11 appearance-none rounded-control border border-ink/60 bg-surface py-2 pl-4 pr-10 text-small font-medium hover:bg-paper"
        >
          {sortOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
      </div>
    </div>
  );
}
