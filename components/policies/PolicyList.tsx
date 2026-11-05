import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';
import { getPolicyPages } from '@/lib/content/data';
import { formatDayMonthYear } from '@/lib/dates';

/** Cards for every published policy. Omitted entirely when there are none. */
export async function PolicyList() {
  const pages = await getPolicyPages();
  if (pages.length === 0) {
    return (
      <p className="max-w-prose text-ink/85">
        Our policies are being updated. Please{' '}
        <TextLink href="/contact">contact us</TextLink> if you have a question.
      </p>
    );
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {pages.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/policies/${p.slug}`}
            className="group flex h-full flex-col rounded-card border border-line bg-card p-6 shadow-raised transition-colors hover:bg-paper"
          >
            <span className="inline-flex items-center gap-2 text-brand-ink">
              <FileText className="size-5" aria-hidden />
              <span className="text-small font-semibold tracking-wide uppercase">
                Policy
              </span>
            </span>
            <h2 className="mt-3 font-display text-h3 text-ink">{p.title}</h2>
            <p className="mt-2 flex-1 text-ink/85">{p.summary}</p>
            <span className="mt-4 flex items-center justify-between gap-3 text-small text-muted-foreground">
              <span>Last updated {formatDayMonthYear(p.updatedAt)}</span>
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
