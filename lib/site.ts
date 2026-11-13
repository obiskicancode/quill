/**
 * Builds contact and map links from the resolved site configuration. All
 * helpers are pure and return `null` when the configured data cannot form a
 * usable link, so callers can hide the action instead of rendering a dead one.
 */
import type { SiteConfig } from '@/types/site.types';

/** Telephone link for the hotel's published contact number. */
export const telHref = (site: SiteConfig) => `tel:${site.contact.phoneTel}`;

/** WhatsApp link, optionally with a pre-filled message. */
export const whatsappHref = (
  site: SiteConfig,
  message: string = site.contact.whatsappMessage,
) =>
  `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;

/** Google Maps directions link, preferring a configured URL over a map query. */
export const directionsHref = (site: SiteConfig): string | null =>
  site.address.directionsUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.mapQuery)}`
    : null);

/** Embeddable map URL, preferring a configured embed over a map query. */
export const mapEmbedSrc = (site: SiteConfig): string | null =>
  site.address.mapEmbedUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(site.address.mapQuery)}&output=embed`
    : null);

/** Google Maps search link for the hotel address. */
export const addressHref = (site: SiteConfig): string | null =>
  site.address.addressUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.mapQuery)}`
    : null);
