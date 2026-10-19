import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

import { RichText } from '@/components/content/RichText';
import {
  CancellationSummary,
  HouseRulesList,
} from '@/components/policies/PolicySummary';
import { PolicyToc } from '@/components/policies/PolicyToc';
import { PrintButton } from '@/components/policies/PrintButton';
import { config } from '@/config';
import { getPolicyPage, getPolicySettings } from '@/lib/content/data';
import { parsePreview } from '@/lib/content/preview';
import { policyHeadings } from '@/lib/content/rich';
import { POLICY_SLUGS, type PolicySlug } from '@/types/content.types';

const isPolicySlug = (s: string): s is PolicySlug =>
  (POLICY_SLUGS as readonly string[]).includes(s);

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// The four policy slugs are known ahead of time, so they are pre-rendered and anything else 404s.
export const dynamicParams = false;
export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return { title: 'Policies' };
  const page = await getPolicyPage(slug, parsePreview(undefined));
  if (!page) return { title: 'Policies' };
  const title = page.metaTitle ?? page.title;
  const description = page.metaDescription ?? page.summary;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

export default async function PolicyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();
  // Preview switches exist only in development.
  const flags = config.isProd
    ? parsePreview(undefined)
    : parsePreview((await searchParams).preview);
  const page = await getPolicyPage(slug, flags);
  if (!page) notFound();

  const headings = policyHeadings(page.body);
  const settings = getPolicySettings();

  return (
    <div className="container-page section-y">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-12">
        <article className="min-w-0 max-w-[70ch]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/policies"
              className="inline-flex min-h-11 items-center gap-2 text-small font-semibold underline-offset-4 hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden />
              All policies
            </Link>
            <PrintButton />
          </div>

          <h1
            id="policy-title"
            tabIndex={-1}
            className="mt-4 text-balance font-display text-h2"
          >
            {page.title}
          </h1>
          <p className="mt-2 text-small text-muted">
            Last updated {formatDate(page.updatedAt)}
          </p>

          {slug === 'cancellation-policy' && (
            <div className="mt-6">
              <CancellationSummary policy={settings.cancellation} />
            </div>
          )}
          {slug === 'house-rules' && (
            <div className="mt-6">
              <HouseRulesList policy={settings.houseRules} />
            </div>
          )}

          <div
            className={
              slug === 'cancellation-policy' || slug === 'house-rules'
                ? 'mt-8'
                : 'mt-6'
            }
          >
            <RichText blocks={page.body} />
          </div>

          <p className="mt-10 text-small text-muted">
            Questions about this policy?{' '}
            <Link
              href="/contact"
              className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
            >
              Contact us
            </Link>
            .
          </p>
        </article>

        <aside
          aria-label="On this page"
          className="mt-8 lg:sticky lg:top-6 lg:mt-0"
        >
          <PolicyToc headings={headings} />
        </aside>
      </div>
    </div>
  );
}
