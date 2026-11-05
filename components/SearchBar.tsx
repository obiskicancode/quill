'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { StayPicker } from '@/components/stay/StayPicker';
import { todayISO } from '@/lib/dates';
import { buildSearchHref, initialSearch, validateSearch } from '@/lib/rooms';
import type { SearchState } from '@/types/site.types';

/**
 * The landing page's availability search: the hero variant of the stay picker,
 * plus the pending search and the jump to the rooms list it drives.
 */
export function SearchBar() {
  const router = useRouter();
  const [search, setSearch] = useState<SearchState>(initialSearch);
  const [isPending, startTransition] = useTransition();

  /** Runs the search and hands the picker an error to show, so nothing commits on a bad stay. */
  function run(next: SearchState): string | null {
    const message = validateSearch(next, todayISO());
    if (message) return message;
    startTransition(() => {
      router.push(buildSearchHref('/rooms', next));
    });
    return null;
  }

  return (
    <StayPicker
      variant="hero"
      value={search}
      onChange={(patch) => setSearch((s) => ({ ...s, ...patch }))}
      onSubmit={run}
      isPending={isPending}
    />
  );
}
