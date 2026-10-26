'use client';

import { useEffect, useState } from 'react';

import type { PolicyHeading } from '@/lib/content/rich';

/**
 * On-this-page table of contents. The current section is highlighted as the reader scrolls.
 * Collapsible on small screens (a <details>), a labelled nav on larger ones.
 */
export function PolicyToc({ headings }: { headings: PolicyHeading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const list = (
    <ul className="space-y-1">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            onClick={() => setOpen(false)}
            aria-current={active === h.id ? 'true' : undefined}
            className={`text-small block min-h-11 py-1.5 underline-offset-4 transition-colors hover:underline ${
              h.level === 3 ? 'pl-4' : ''
            } ${active === h.id ? 'text-ink font-semibold' : 'text-muted-foreground'}`}
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
        className="rounded-card border-line bg-card border p-4 md:border-0 md:bg-transparent md:p-0"
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
