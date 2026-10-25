import { getFormSettings, getHotelSettings } from '@/lib/content/data';
import { getRoomTypesWithDetails } from '@/lib/db/queries/content-data';

import { ContactForm } from './ContactForm';

interface FormSectionProps {
  topic: string | null;
  room: string | null;
  bookingRef: string | null;
}

/** Loads the form's settings (the reply time) and renders the client form. Omitted if the settings are missing. */
export async function FormSection({
  topic,
  room,
  bookingRef,
}: FormSectionProps) {
  const settings = await getFormSettings();
  if (!settings) return null;
  const [hotel, rooms] = await Promise.all([
    getHotelSettings(),
    getRoomTypesWithDetails(),
  ]);
  return (
    <ContactForm
      initialTopic={topic}
      initialRoom={room}
      initialRef={bookingRef}
      rooms={rooms.map(({ row }) => ({ slug: row.slug, name: row.name }))}
      responseHours={settings.responseHours}
      whatsappHref={`https://wa.me/${hotel.whatsappNumber}?text=${encodeURIComponent(hotel.whatsappPrefillMessage)}`}
    />
  );
}
