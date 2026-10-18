import type { SiteConfig } from "./types";

/**
 * Single source of truth for brand, contact details and page copy.
 * Anything in [square brackets] is a placeholder the client must supply.
 * No component hard-codes the hotel name.
 */
const name = "Divine Excellent Luxury Apartments";

export const site: SiteConfig = {
  name,
  shortName: "Divine Ex.",
  description:
    "Comfortable rooms and serviced apartments in Nigeria. Check availability, book direct and pay securely online.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: null, // e.g. { src: '/images/logo.svg', alt: 'Divine Excellent Apartments', width: 160, height: 48 }
  bookingHref: "/checkout",
  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Rooms", href: "/rooms" },
    { label: "Amenities", href: "/amenities" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    phoneDisplay: "[+234 000 000 0000]",
    phoneTel: "+2340000000000",
    whatsappNumber: "2340000000000",
    whatsappMessage: `Hello ${name}, I'd like to make a booking.`,
    email: "[reservations@yourhotel.com]",
  },
  address: {
    lines: ["[Street address]", "[Area, City]", "Nigeria"],
    mapQuery: null, // set to e.g. 'Divine Excellent Apartments, Street, City' to switch the map on
  },
  reception: "[Reception hours, e.g. daily 7:00 am to 10:00 pm]",
  landmarks: [
    { name: "[Nearby landmark one]", distance: "[5 min drive]" },
    { name: "[Nearby landmark two]", distance: "[10 min walk]" },
  ],
  social: [
    { label: "Instagram", href: "#", platform: "instagram" },
    { label: "Facebook", href: "#", platform: "facebook" },
  ],
  googleReviewsUrl: null, // paste the Google reviews link; the rating shows once rating and count are set
  reviews: { rating: null, count: null },
  policies: [
    { label: "Terms", href: "/policies/terms" },
    { label: "Privacy", href: "/policies/privacy" },
    { label: "Cancellation", href: "/policies/cancellation-policy" },
    { label: "House rules", href: "/policies/house-rules" },
  ],
  trust: [
    { id: "reviews", label: "Guest reviews on Google", enabled: true },
    { id: "secure-payment", label: "Pay securely online", enabled: true },
    // Turn on only once the cancellation policy supports it.
    { id: "free-cancellation", label: "Free cancellation", enabled: false },
    {
      id: "power-security",
      label: "24-hour power and security",
      enabled: true,
    },
  ],
  // PLACEHOLDER COPY: confirm with the client.
  hero: {
    headline: "Comfortable rooms, steady power, and a warm welcome.",
    subheadline:
      "Book direct, pay securely online, and get your confirmation straight away.",
    image: {
      src: "/images/hero.webp",
      alt: `A guest room at ${name} with a made bed and warm lighting`,
    },
    video: { src: "/video/hero.mp4", type: "video/mp4" },
  },
  intro: {
    heading: "Rest well, whatever brings you here.",
    body: [
      `${name} offers private rooms and serviced apartments for guests visiting for work, family or an event.`,
      "You get reliable power, secure parking and a front desk that picks up when you call. Tell us what you need and we'll sort it.",
    ],
    image: {
      src: "/images/intro.webp",
      alt: `The entrance and reception area at ${name}`,
    },
    learnMoreHref: "/about",
  },
  cta: {
    heading: "Ready to book your stay?",
    text: "Check dates and book online, or message us and we'll help you choose a room.",
  },
};

export const telHref = () => `tel:${site.contact.phoneTel}`;

export const whatsappHref = (message: string = site.contact.whatsappMessage) =>
  `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const directionsHref = (): string | null =>
  site.address.mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.mapQuery)}`
    : null;

export const mapEmbedSrc = (): string | null =>
  site.address.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(site.address.mapQuery)}&output=embed`
    : null;
