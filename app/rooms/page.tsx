import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { CtaBand } from '@/components/CtaBand'
import { GroupEventStrip } from '@/components/GroupEventStrip'
import { HelpBlock } from '@/components/HelpBlock'
import { PolicyHighlights } from '@/components/PolicyHighlights'
import { RoomsExplorer } from '@/components/rooms/RoomsExplorer'
import { SkeletonCard } from '@/components/rooms/SkeletonCard'
import { roomTypes } from '@/lib/rooms'

export const metadata: Metadata = {
  title: 'Rooms & Accommodation',
  description: 'Compare rooms and apartments, check availability for your dates and book direct.',
}

function ExplorerFallback() {
  return (
    <div className="container-page pt-10" aria-busy="true">
      <ul className="grid gap-6 lg:grid-cols-2 lg:pl-[calc(17rem+2.5rem)]">
        {[0, 1].map((i) => (
          <li key={i}><SkeletonCard /></li>
        ))}
      </ul>
    </div>
  )
}

export default function RoomsPage() {
  return (
    <>
      <section aria-labelledby="rooms-title" className="container-page pb-8 pt-4 md:pb-10 md:pt-6">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Rooms' }]} />
        <h1 id="rooms-title" className="mt-3 font-display text-h2 md:text-display">
          Rooms &amp; Accommodation
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-ink/85">
          Compare our rooms and apartments side by side. Add your dates to see the total for your stay, with taxes and fees shown up front.
        </p>
      </section>

      <Suspense fallback={<ExplorerFallback />}>
        <RoomsExplorer rooms={roomTypes} />
      </Suspense>

      <HelpBlock />
      <GroupEventStrip />
      <PolicyHighlights />
      <CtaBand />
    </>
  )
}
