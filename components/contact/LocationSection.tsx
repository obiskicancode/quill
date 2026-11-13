import { getHotelSettings, getLandmarks } from '@/lib/content/data';

import { MapCard, type MapCardData } from '../MapCard';

const real = (v: string | null | undefined) =>
  v && !v.includes('[') ? v : null;

/** The shared MapCard with the hotel's location data. Loads the map only when it scrolls into view. */
export async function LocationSection() {
  const s = await getHotelSettings();
  if (!s) return null;
  const a = s.address;
  const lines = [
    a.line1,
    [a.area, a.city, a.state].filter(Boolean).join(', '),
    a.country,
  ].filter(Boolean);
  const coords =
    s.latitude !== null && s.longitude !== null
      ? `${s.latitude},${s.longitude}`
      : null;
  const query =
    coords ??
    (real(a.line1) ? [a.line1, a.city, a.state, a.country].join(', ') : null);
  const phone = s.publicPhones[0];

  const data: MapCardData = {
    addressLines: lines,
    reception: s.receptionHours,
    landmarks: await getLandmarks(),
    telHref: phone ? `tel:${phone.tel}` : '#',
    phoneDisplay: phone?.display,
    embedSrc:
      s.googleMapsEmbedUrl ??
      (query
        ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
        : null),
    directionsHref:
      s.googleMapsUrl ??
      (query
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
        : null),
    addressHref:
      s.googleMapsUrl ??
      (query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : null),
    directionsText: s.directionsText,
    airportNote: s.nearestAirportNote,
    staticImage: {
      src: '/images/pages/map-static.webp',
      alt: 'A map of the area around the hotel',
    },
  };
  return <MapCard data={data} heading="Location" loadOnView />;
}
