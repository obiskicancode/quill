import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { getPolicyPages } from '@/lib/content/data';

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Cards for every published policy. Omitted entirely when there are none. */
export async function PolicyList() {
  const pages = await getPolicyPages();
  if (pages.length === 0) {
    return (
      <p className="text-ink/85 max-w-prose">
        Our policies are being updated. Please{' '}
        <Link
          href="/contact"
          className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
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
            className="group rounded-card border-line bg-card shadow-raised hover:bg-paper flex h-full flex-col border p-6 transition-colors"
          >
            <span className="text-brand-ink inline-flex items-center gap-2">
              <FileText className="size-5" aria-hidden />
              <span className="text-small font-semibold tracking-wide uppercase">
                Policy
              </span>
            </span>
            <h2 className="font-display text-h3 text-ink mt-3">{p.title}</h2>
            <p className="text-ink/85 mt-2 flex-1">{p.summary}</p>
            <span className="text-small text-muted-foreground mt-4 flex items-center justify-between gap-3">
              <span>Last updated {formatDate(p.updatedAt)}</span>
              <span className="text-ink inline-flex items-center gap-1 font-semibold transition-transform group-hover:translate-x-0.5">
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
