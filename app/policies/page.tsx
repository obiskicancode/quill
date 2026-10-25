import type { Metadata } from 'next';

import { PageHero } from '@/components/content/PageHero';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import { PolicyList } from '@/components/policies/PolicyList';

export const metadata: Metadata = {
  title: 'Policies',
  description:
    'Our terms of booking, privacy policy, cancellation policy and house rules, in one place.',
};

const hero = {
  src: '/images/pages/contact-hero.webp',
  alt: 'The hotel reception desk',
};

export default async function PoliciesPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Policies' }]}
        title="Policies"
        intro="Everything that applies when you book and stay with us."
        image={hero}
      />

      <Section
        label="our policies"
        skeleton={
          <SectionSkeleton variant="list" label="Loading our policies" />
        }
      >
        <div className="container-page section-y">
          <PolicyList />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
