'use client';

import { useState } from 'react';

import { useScrollSpy } from '@/hooks/use-scroll-spy';
import type { PolicyHeading } from '@/types/content.types';

/**
 * On-this-page table of contents. The current section is highlighted as the reader scrolls.
 * Collapsible on small screens (a <details>), a labelled nav on larger ones.
 */
export function PolicyToc({ headings }: { headings: PolicyHeading[] }) {
  const active = useScrollSpy(headings.map((h) => h.id));
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  const list = (
    <ul className="space-y-1">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            onClick={() => setOpen(false)}
            aria-current={active === h.id ? 'true' : undefined}
            className={`block min-h-11 py-1.5 text-small underline-offset-4 transition-colors hover:underline ${
              h.level === 3 ? 'pl-4' : ''
            } ${active === h.id ? 'font-semibold text-ink' : 'text-muted-foreground'}`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label="On this page" className="print:hidden">
      <details
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-card border border-line bg-card p-4 md:border-0 md:bg-transparent md:p-0"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold md:mb-3 md:cursor-default [&::-webkit-details-marker]:hidden">
          On this page
          <span
            aria-hidden
            className={`transition-transform md:hidden ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </summary>
        {list}
      </details>
    </nav>
  );
}
