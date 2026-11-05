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
import { TextLink } from '@/components/ui/text-link';
import { POLICY_SLUGS } from '@/constants/content';
import { getPolicyPage, getPolicySettings } from '@/lib/content/data';
import { policyHeadings } from '@/lib/content/rich';
import { formatDayMonthYear } from '@/lib/dates';
import type { PolicySlug } from '@/types/content.types';

const isPolicySlug = (s: string): s is PolicySlug =>
  (POLICY_SLUGS as readonly string[]).includes(s);

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
  const page = await getPolicyPage(slug);
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();
  const page = await getPolicyPage(slug);
  if (!page) notFound();

  const headings = policyHeadings(page.body);
  const settings = await getPolicySettings();

  return (
    <div className="container-page section-y">
      <div className="booking-rail">
        <article className="max-w-[70ch] min-w-0">
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
            className="mt-4 font-display text-h2 text-balance"
          >
            {page.title}
          </h1>
          <p className="mt-2 text-small text-muted-foreground">
            Last updated {formatDayMonthYear(page.updatedAt)}
          </p>

          {slug === 'cancellation-policy' && (
            <div className="mt-6">
              <CancellationSummary
                policy={settings.cancellation}
                checkInTime={settings.houseRules.checkInTime}
                checkOutTime={settings.houseRules.checkOutTime}
              />
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

          <p className="mt-10 text-small text-muted-foreground">
            Questions about this policy?{' '}
            <TextLink href="/contact">Contact us</TextLink>.
          </p>
        </article>

        <aside
          aria-label="On this page"
          className="sticky-under-header mt-8 lg:mt-0"
        >
          <PolicyToc headings={headings} />
        </aside>
      </div>
    </div>
  );
}
