import type { SiteConfig } from '@/types/site.types';

export const telHref = (site: SiteConfig) => `tel:${site.contact.phoneTel}`;

export const whatsappHref = (
  site: SiteConfig,
  message: string = site.contact.whatsappMessage,
) =>
  `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const directionsHref = (site: SiteConfig): string | null =>
  site.address.directionsUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.mapQuery)}`
    : null);

export const mapEmbedSrc = (site: SiteConfig): string | null =>
  site.address.mapEmbedUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(site.address.mapQuery)}&output=embed`
    : null);

export const addressHref = (site: SiteConfig): string | null =>
  site.address.addressUrl ??
  (site.address.mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.mapQuery)}`
    : null);
