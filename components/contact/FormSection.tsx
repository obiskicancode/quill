import { getFormSettings, getHotelSettings } from '@/lib/content/data'
import type { PreviewFlags } from '@/lib/content/preview'
import { roomTypes } from '@/lib/rooms'
import { ContactForm } from './ContactForm'

interface FormSectionProps {
  flags: PreviewFlags
  topic: string | null
  room: string | null
  bookingRef: string | null
  demo: string | null
}

/** Loads the form's settings (the reply time) and renders the client form. Omitted if the settings are missing. */
export async function FormSection({ flags, topic, room, bookingRef, demo }: FormSectionProps) {
  const settings = await getFormSettings(flags)
  if (!settings) return null
  const hotel = getHotelSettings()
  return (
    <ContactForm
      initialTopic={topic}
      initialRoom={room}
      initialRef={bookingRef}
      rooms={roomTypes.map((r) => ({ slug: r.slug, name: r.name }))}
      responseHours={settings.responseHours}
      whatsappHref={`https://wa.me/${hotel.whatsappNumber}?text=${encodeURIComponent(hotel.whatsappPrefillMessage)}`}
      demo={demo}
    />
  )
}
