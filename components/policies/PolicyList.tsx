import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { getPolicyPages } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Cards for every published policy. Omitted entirely when there are none. */
export async function PolicyList({ flags }: { flags: PreviewFlags }) {
  const pages = await getPolicyPages(flags);
  if (pages.length === 0) {
    return (
      <p className="max-w-prose text-ink/85">
        Our policies are being updated. Please{' '}
        <Link
          href="/contact"
          className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
        >
          contact us
        </Link>{' '}
        if you have a question.
      </p>
    );
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {pages.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/policies/${p.slug}`}
            className="group flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-raised transition-colors hover:bg-paper"
          >
            <span className="inline-flex items-center gap-2 text-accent-ink">
              <FileText className="size-5" aria-hidden />
              <span className="text-small font-semibold uppercase tracking-wide">
                Policy
              </span>
            </span>
            <h2 className="mt-3 font-display text-h3 text-ink">{p.title}</h2>
            <p className="mt-2 flex-1 text-ink/85">{p.summary}</p>
            <span className="mt-4 flex items-center justify-between gap-3 text-small text-muted">
              <span>Last updated {formatDate(p.updatedAt)}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-ink transition-transform group-hover:translate-x-0.5">
                Read
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
