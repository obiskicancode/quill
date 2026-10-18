import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CtaBand } from '@/components/CtaBand'
import { PageHero } from '@/components/content/PageHero'
import { Section } from '@/components/content/Section'
import { SectionSkeleton } from '@/components/content/Skeletons'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'
import { EnquirySection } from '@/components/enquiry/EnquirySection'
import { getFormSettings, getHotelSettings } from '@/lib/content/data'
import { parsePreview } from '@/lib/content/preview'
import { roomTypes } from '@/lib/rooms'

export const metadata: Metadata = {
  title: 'Booking enquiry',
  description: 'Ask about dates and room availability before you book. We will get back to you quickly.',
}

const hero = { src: '/images/pages/contact-hero.webp', alt: 'A guest asking a question at reception' }

const safeRef = (ref: string | null) => {
  if (!ref) return null
  return /^[A-Za-z0-9-]{4,30}$/.test(ref) ? ref : null
}

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const get = (name: string): string | null => {
    const v = sp[name]
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
  }
  const flags = process.env.NODE_ENV === 'production' ? parsePreview(undefined) : parsePreview(sp.preview)
  const settings = await getFormSettings(flags)
  if (!settings) notFound()
  const hotel = getHotelSettings()
  const refCode = safeRef(get('ref'))
  const room = get('room')
  const demo = get('demo')

  const whatsapp = `https://wa.me/${hotel.whatsappNumber}?text=${encodeURIComponent(hotel.whatsappPrefillMessage)}`

  const source = get('from') || '/enquiry'

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Booking enquiry' }]}
        title="Booking enquiry"
        intro="Check dates, ask about a group stay or reserve a room by enquiry. We reply within a few hours."
        image={hero}
      />

      <EnquirySection whatsappHref={whatsapp} refCode={refCode} />

      <Section label="enquiry form" skeleton={<SectionSkeleton variant="form" label="Loading enquiry form" />}>
        <div className="container-page section-y max-w-4xl">
          <EnquiryForm
            rooms={roomTypes}
            responseHours={settings.responseHours}
            whatsappHref={whatsapp}
            initialRoom={room}
            sourcePage={source}
            demo={demo}
          />
        </div>
      </Section>

      <CtaBand />
    </>
  )
}
