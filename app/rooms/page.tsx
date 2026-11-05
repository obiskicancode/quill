import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import { GroupEventStrip } from '@/components/GroupEventStrip';
import { Reveal } from '@/components/motion/Reveal';
import { TextReveal } from '@/components/motion/TextReveal';
import { PolicyHighlights } from '@/components/PolicyHighlights';
import { RoomsExplorer } from '@/components/rooms/RoomsExplorer';
import { SkeletonCard } from '@/components/rooms/SkeletonCard';
import { getRoomTypesWithDetails } from '@/lib/db/queries/content-data';

export const metadata: Metadata = {
  title: 'Rooms & Accommodation',
  description:
    'Compare rooms and apartments, check availability for your dates and book direct.',
};

function ExplorerFallback() {
  return (
    <div className="container-page pt-10" aria-busy="true">
      <ul className="grid gap-6 lg:grid-cols-2 lg:pl-[calc(var(--rooms-rail)+2.5rem)]">
        {[0, 1].map((i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function RoomsPage() {
  const rooms = (await getRoomTypesWithDetails()).map((r) => r.room);
  return (
    <>
      <section
        aria-labelledby="rooms-title"
        className="container-page pt-4 pb-8 md:pt-6 md:pb-10"
      >
        <Reveal>
          <Breadcrumb
            items={[{ label: 'Home', href: '/' }, { label: 'Rooms' }]}
          />
        </Reveal>
        <TextReveal
          id="rooms-title"
          as="h1"
          text="Rooms & Accommodation"
          onScroll={false}
          staggerChildren={0.05}
          className="mt-3 font-display text-h2 md:text-display"
        />
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-2xl text-body-lg text-ink/85">
            Compare our rooms and apartments side by side. Add your dates to see
            the total for your stay, with taxes and fees shown up front.
          </p>
        </Reveal>
      </section>

      <Suspense fallback={<ExplorerFallback />}>
        <RoomsExplorer rooms={rooms} />
      </Suspense>

      <Section
        label="group booking"
        skeleton={
          <SectionSkeleton variant="strip" label="Loading group booking" />
        }
      >
        <Reveal>
          <GroupEventStrip />
        </Reveal>
      </Section>
      <Section
        label="the booking policies"
        skeleton={
          <SectionSkeleton
            variant="cards"
            label="Loading the booking policies"
          />
        }
      >
        <Reveal>
          <PolicyHighlights />
        </Reveal>
      </Section>
      <CtaBand />
    </>
  );
}
