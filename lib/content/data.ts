import { cache } from "react";
import { getCheckoutSettings } from "../checkout/settings";
import type { ExtraItem } from '@/types/checkout.types';
import { testimonials as sampleTestimonials } from "../data";
import { hotelSettings as roomHotelSettings } from "../room-detail";
import { roomAmenityLabels, roomTypes, type RoomAmenityKey } from "../rooms";
import { site } from "../site";
import type { Testimonial } from "@/types/site.types";
import { gate, type PreviewFlags } from "./preview";
import type {
  AnalyticsSettings,
  ConsentSettings,
  Facility,
  Faq,
  GalleryImageRecord,
  HotelSettings,
  NearbyAttraction,
  PolicyPage,
  PolicySettings,
  PolicySlug,
  SitePage,
  SocialLink,
  TeamMember,
} from "@/types/content.types";
import { POLICY_SLUGS } from "@/types/content.types";

/*
 * TYPED PLACEHOLDER DATA. In production these come from the admin database (site_pages, team_members,
 * nearby_attractions, facilities, gallery_images, faqs, hotel settings). Anything in [brackets] is a placeholder
 * for the hotel to fill in. Nothing here is a real award, statistic, review or rating.
 */

// ------------------------------------------------------------------ hotel settings
export const getHotelSettings = cache(
  (): HotelSettings => ({
    displayName: site.name,
    yearEstablished: null, // [placeholder] the strip is hidden until a year is set. Preview it with ?preview=year
    roomCount: roomTypes.length,
    address: {
      line1: "[Street address]",
      area: "[Area]",
      city: "[City]",
      state: "[State]",
      country: "Nigeria",
    },
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
    googleMapsEmbedUrl: null,
    directionsText:
      "[A short note on how to find the entrance, for example: look for the green gate next to the pharmacy.]",
    nearestAirportNote: "[Nearest airport and the usual travel time by car.]",
    publicPhones: [
      {
        label: "Reception",
        display: site.contact.phoneDisplay,
        tel: site.contact.phoneTel,
      },
    ],
    whatsappNumber: site.contact.whatsappNumber,
    whatsappPrefillMessage: site.contact.whatsappMessage,
    publicEmail: site.contact.email,
    contactFormRecipient: "[enquiries@yourhotel.com]",
    receptionHours: site.reception,
    googleReviewsUrl: site.googleReviewsUrl,
    enquiryResponseHours: 24, // [placeholder]
    socialLinks: [
      {
        id: "s1",
        platform: "instagram",
        label: "Instagram",
        url: "https://instagram.com/",
      },
      {
        id: "s2",
        platform: "facebook",
        label: "Facebook",
        url: "https://facebook.com/",
      },
    ] satisfies SocialLink[],
    analytics: analyticsSettings,
  }),
);

/** Analytics stays off until the hotel configures a provider, so no tag ever loads by default. */
const analyticsSettings: AnalyticsSettings = {
  provider: "meta_pixel", // [placeholder] set to 'ga4', 'plausible' or 'meta_pixel' once a real ID exists
  measurementId: "null", // [placeholder] e.g. 'G-XXXXXXX' for GA4
  marketingEnabled: false,
};

/** Read by the cookie banner. It only appears when something optional is actually configured. */
export const getConsentSettings = cache(
  (): ConsentSettings => ({
    enabled:
      analyticsSettings.provider !== "none" &&
      Boolean(analyticsSettings.measurementId),
    privacyPolicyHref: "/policies/privacy",
    retentionDays: 180,
  }),
);

// ------------------------------------------------------------------ site_pages
const hero = (slug: string, alt: string) => ({
  src: `/images/pages/${slug}-hero.webp`,
  alt,
});

export const sitePages: Record<SitePage["slug"], SitePage> = {
  about: {
    slug: "about",
    title: "About us",
    intro:
      "A welcoming place to stay, run by people who care how your visit goes.",
    heroImage: hero("about", "The front of the hotel in the evening"),
    body: [
      { type: "h3", text: "Our story" },
      {
        type: "p",
        text: "[Sample] A few warm sentences about how the hotel began and who it is for. The hotel replaces this text in the admin.",
      },
      {
        type: "p",
        text: "[Sample] A second paragraph about what the hotel is proud of, in the hotel's own words.",
      },
      { type: "h3", text: "How we work" },
      {
        type: "p",
        text: "[Sample] A short paragraph about the team and how guests are looked after.",
      },
      {
        type: "ul",
        items: [
          "[Sample] One thing guests can count on",
          "[Sample] Another thing guests can count on",
        ],
      },
    ],
    content: {
      valueCards: [
        {
          icon: "power",
          title: "Steady power",
          text: "Lights, cooling and Wi-Fi keep going through the night.",
        },
        {
          icon: "shield",
          title: "Safe and calm",
          text: "Secure on-site parking and round-the-clock security.",
        },
        {
          icon: "heart",
          title: "Friendly service",
          text: "A front desk that answers when you call.",
        },
        {
          icon: "clock",
          title: "Simple booking",
          text: "Book direct, pay securely and get your confirmation at once.",
        },
      ],
      images: [
        {
          src: "/images/about/story-1.webp",
          alt: "The reception area with a seating corner",
        },
        {
          src: "/images/about/story-2.webp",
          alt: "Guests having breakfast in the restaurant",
        },
      ],
      surroundingsText:
        "[Sample] A short paragraph about the neighbourhood: what is around the hotel and how easy it is to get about.",
    },
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
  },
  amenities: {
    slug: "amenities",
    title: "Amenities & services",
    intro: "What you can use during your stay, and what you can add.",
    heroImage: hero("amenities", "The pool area with loungers"),
    body: [],
    content: { valueCards: [], images: [] },
    metaTitle: "Amenities and services",
    metaDescription:
      "Facilities, room amenities and paid extras at the hotel, from the restaurant and pool to parking and airport pickup.",
    ogImage: null,
  },
  gallery: {
    slug: "gallery",
    title: "Gallery",
    intro: "A look at the rooms, the facilities and the area around us.",
    heroImage: hero(
      "gallery",
      "A guest room with a made bed and warm lighting",
    ),
    body: [],
    content: { valueCards: [], images: [] },
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
  },
  contact: {
    slug: "contact",
    title: "Contact & location",
    intro: "Call, message or send us a note. We will get back to you.",
    heroImage: hero("contact", "The hotel reception desk"),
    body: [],
    content: { valueCards: [], images: [] },
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
  },
};

export const getSitePage = cache(
  (slug: SitePage["slug"]): SitePage => sitePages[slug],
);

// ------------------------------------------------------------------ about
const team: TeamMember[] = [
  {
    id: "tm1",
    name: "[Team member name]",
    role: "[General manager]",
    bio: "[Sample] One or two sentences about this person and how they help guests.",
    photo: {
      src: "/images/team/member-1.webp",
      alt: "[Team member name], [General manager]",
    },
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: "tm2",
    name: "[Team member name]",
    role: "[Front office lead]",
    bio: "[Sample] One or two sentences about this person and how they help guests.",
    photo: {
      src: "/images/team/member-2.webp",
      alt: "[Team member name], [Front office lead]",
    },
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: "tm3",
    name: "[Team member name]",
    role: "[Head of housekeeping]",
    bio: "[Sample] One or two sentences about this person and how they help guests.",
    photo: null,
    sortOrder: 3,
    isPublished: true,
  },
];

const attractions = [
  {
    id: "na1",
    name: "[Nearby attraction]",
    description: "[Sample] A line about what it is and why guests go.",
    distanceNote: "[10 min walk]",
    sortOrder: 1,
  },
  {
    id: "na2",
    name: "[Nearby attraction]",
    description: "[Sample] A line about what it is and why guests go.",
    distanceNote: "[15 min drive]",
    sortOrder: 2,
  },
  {
    id: "na3",
    name: "[Nearby attraction]",
    description: "[Sample] A line about what it is and why guests go.",
    distanceNote: "[20 min drive]",
    sortOrder: 3,
  },
] satisfies NearbyAttraction[];

export const getAboutPage = (f: PreviewFlags) =>
  gate(f, "story", getSitePage("about"), {
    ...getSitePage("about"),
    body: [],
    content: { valueCards: [], images: [] },
  });
export const getValueCards = async (f: PreviewFlags) =>
  (await gate(f, "values", getSitePage("about").content.valueCards, [])).slice(
    0,
    4,
  );
export const getHighlights = async (f: PreviewFlags) => {
  const s = getHotelSettings();
  const data = {
    year: f.has("year", "highlights") ? 1999 : s.yearEstablished,
    rooms: s.roomCount,
  };
  return gate(f, "highlights", data, { year: null, rooms: null });
};
export const getTeam = async (f: PreviewFlags) =>
  (await gate(f, "team", team, []))
    .filter((m) => m.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);
export const getAttractions = async (f: PreviewFlags) =>
  (await gate(f, "surroundings", attractions, [])).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
export const getPublishedTestimonials = (
  f: PreviewFlags,
): Promise<Testimonial[]> => gate(f, "testimonials", sampleTestimonials, []);

// ------------------------------------------------------------------ amenities
const facilities: Facility[] = [
  {
    id: "f1",
    slug: "restaurant",
    name: "Restaurant",
    description:
      "[Sample] A line or two about the food, the setting and who it suits.",
    image: {
      src: "/images/facilities/restaurant.webp",
      alt: "Tables set for breakfast in the restaurant",
    },
    openingHours: "[Daily, 7:00 am to 10:00 pm]",
    pricing: "paid",
    priceNote: "[Menu prices shown at the restaurant]",
    capacity: null,
    layouts: [],
    ctaLabel: null,
    ctaTopic: null,
    kind: "other",
    sortOrder: 1,
  },
  {
    id: "f2",
    slug: "pool",
    name: "Swimming pool",
    description:
      "[Sample] A line or two about the pool and the area around it.",
    image: {
      src: "/images/facilities/pool.webp",
      alt: "The pool with loungers beside it",
    },
    openingHours: "[Daily, 8:00 am to 8:00 pm]",
    pricing: "free",
    priceNote: "Free for guests",
    capacity: null,
    layouts: [],
    ctaLabel: null,
    ctaTopic: null,
    kind: "other",
    sortOrder: 2,
  },
  {
    id: "f3",
    slug: "parking",
    name: "Secure parking",
    description:
      "[Sample] A line or two about where guests park and how it is kept safe.",
    image: {
      src: "/images/facilities/parking.webp",
      alt: "The gated parking area",
    },
    openingHours: "Open 24 hours",
    pricing: "free",
    priceNote: "Free for guests",
    capacity: null,
    layouts: [],
    ctaLabel: null,
    ctaTopic: null,
    kind: "other",
    sortOrder: 3,
  },
  {
    id: "f4",
    slug: "conference-hall",
    name: "Conference hall",
    description:
      "[Sample] A line or two about the hall, what it suits and what is included.",
    image: {
      src: "/images/facilities/conference.webp",
      alt: "The conference hall set out classroom style",
    },
    openingHours: "[By booking]",
    pricing: "paid",
    priceNote: "[Hire rates on request]",
    capacity: "[Capacity] guests",
    layouts: ["Theatre", "Classroom", "Boardroom"],
    ctaLabel: "Enquire about events",
    ctaTopic: "event_conference",
    kind: "conference",
    sortOrder: 4,
  },
  {
    id: "f5",
    slug: "airport-pickup",
    name: "Airport pickup",
    description:
      "[Sample] A line or two about how pickups work and how far ahead to ask.",
    image: null,
    openingHours: "[Arranged on request]",
    pricing: "paid",
    priceNote: "Add it when you book",
    capacity: null,
    layouts: [],
    ctaLabel: "Ask about pickup",
    ctaTopic: "general",
    kind: "other",
    sortOrder: 5,
  },
];

export const getFacilities = async (f: PreviewFlags) =>
  (await gate(f, "facilities", facilities, [])).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

/** Amenities that most of the hotel's room types share, computed from the real room data. */
export const getRoomAmenities = async (
  f: PreviewFlags,
): Promise<{ key: RoomAmenityKey; label: string }[]> => {
  const counts = new Map<RoomAmenityKey, number>();
  for (const r of roomTypes)
    for (const a of r.amenities) counts.set(a, (counts.get(a) ?? 0) + 1);
  const common = [...counts]
    .filter(([, n]) => n >= roomTypes.length / 2)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({ key, label: roomAmenityLabels[key] }));
  return gate(f, "roomAmenities", common, []);
};

export const getExtras = async (f: PreviewFlags): Promise<ExtraItem[]> =>
  gate(f, "extras", getCheckoutSettings(new Set()).extras, []);

// ------------------------------------------------------------------ gallery
const categoryPlan: {
  category: GalleryImageRecord["category"];
  count: number;
  alt: string;
}[] = [
  { category: "rooms", count: 12, alt: "A guest room" },
  { category: "facilities", count: 6, alt: "A hotel facility" },
  { category: "exterior", count: 4, alt: "The outside of the hotel" },
  { category: "dining", count: 3, alt: "Food and the dining area" },
  { category: "events", count: 3, alt: "An event space" },
  { category: "surroundings", count: 2, alt: "The area around the hotel" },
];
const sizes = [
  [1600, 1067],
  [1067, 1600],
  [1600, 1067],
  [1200, 1200],
  [1600, 1067],
  [1600, 900],
];
const colors = [
  "#d9d4c8",
  "#c9cfd2",
  "#d8c9b8",
  "#bfc7bd",
  "#cfc6d0",
  "#d5d0b5",
];

const galleryImages: GalleryImageRecord[] = (() => {
  const out: GalleryImageRecord[] = [];
  let n = 0;
  for (const plan of categoryPlan) {
    for (let i = 0; i < plan.count; i++) {
      n++;
      const [width, height] = sizes[n % sizes.length];
      const room =
        plan.category === "rooms" ? roomTypes[i % roomTypes.length] : null;
      out.push({
        id: `g${n}`,
        url: `/images/gallery/g-${n}.webp`,
        thumbnailUrl: `/images/gallery/thumbs/g-${n}.webp`,
        altText: room
          ? `${room.name}, view ${i + 1}`
          : `${plan.alt}, photo ${i + 1}`,
        caption: room ? `${room.name}` : `[Caption for photo ${n}]`,
        category: plan.category,
        roomTypeId: room?.id ?? null,
        facilityId: null,
        width,
        height,
        sortOrder: n,
        isPublished: n !== 17, // one unpublished image, to show that it is left out
        color: colors[n % colors.length],
        blurDataURL: null,
      });
    }
  }
  return out;
})();

export const getGalleryImages = async (f: PreviewFlags) =>
  (await gate(f, "gallery", galleryImages, []))
    .filter((g) => g.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const getRoomTypeOptions = () =>
  roomTypes.map((r) => ({ id: r.id, name: r.name }));

// ------------------------------------------------------------------ contact
const faqs: Faq[] = [
  {
    id: "q1",
    question: "What time are check-in and check-out?",
    answer:
      "[Sample] Check-in is from [time] and check-out is by [time]. Ask us if you need something different.",
    sortOrder: 1,
  },
  {
    id: "q2",
    question: "Can I book for a group or an event?",
    answer:
      "[Sample] Yes. Send us your dates and numbers using the form above and we will reply with a quote.",
    sortOrder: 2,
  },
  {
    id: "q3",
    question: "Is parking available?",
    answer: "[Sample] Yes, secure on-site parking is free for guests.",
    sortOrder: 3,
  },
  {
    id: "q4",
    question: "Can you arrange airport pickup?",
    answer:
      "[Sample] Yes. Add it when you book, or ask us and we will arrange it.",
    sortOrder: 4,
  },
];

export const getFaqs = async (f: PreviewFlags) =>
  (await gate(f, "faq", faqs, [])).sort((a, b) => a.sortOrder - b.sortOrder);
export const getSocialLinks = async (f: PreviewFlags) =>
  gate(f, "contactCards", getHotelSettings().socialLinks, []);

/** Conference and event facilities, for the events strip. */
export const getEventFacilities = async (f: PreviewFlags) =>
  gate(
    f,
    "events",
    facilities
      .filter((x) => x.kind !== "other")
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  );

/** Contact details for the quick cards. With the "empty" preview every field is missing, so the section is omitted. */
export const getContactInfo = (f: PreviewFlags) =>
  gate(f, "contactCards", getHotelSettings(), {
    ...getHotelSettings(),
    publicPhones: [],
    publicEmail: null,
    receptionHours: null,
    whatsappNumber: "",
  });

/** Location details. */
export const getLocationInfo = (f: PreviewFlags) =>
  gate(f, "location", getHotelSettings(), null);

export const getLandmarks = () =>
  attractions
    .slice(0, 3)
    .map((a) => ({ name: a.name, distance: a.distanceNote }));

/** The contact form needs the response time. Gated so its loading and error states can be previewed. */
export const getFormSettings = (f: PreviewFlags) =>
  gate(
    f,
    "form",
    { responseHours: getHotelSettings().enquiryResponseHours },
    null,
  );

// ------------------------------------------------------------------ policies
/*
 * POLICY PAGES. In production these are site_pages rows with a policy type.
 * Every piece of legal text below is a [placeholder] the hotel must review and replace
 * with its own wording (and, for the privacy policy, against the Nigeria Data Protection
 * Act) before launch. Nothing here is legal advice.
 */
const policyPages: Record<PolicySlug, PolicyPage> = {
  terms: {
    slug: "terms",
    title: "Terms of booking",
    summary:
      "How a booking is made, paid for and changed when you book with us directly.",
    body: [
      {
        type: "p",
        text: "[Placeholder] These terms apply to every booking made through this website. They sit alongside our cancellation policy and privacy policy, which are linked below.",
      },
      { type: "h2", text: "Making a booking" },
      {
        type: "p",
        text: "[Placeholder] When you submit a booking we hold your chosen room for a short time while you pay. A booking is only confirmed once you receive a confirmation email from us.",
      },
      {
        type: "ul",
        items: [
          "[Placeholder] You must give accurate guest details, including a name that matches a valid photo ID.",
          "[Placeholder] The lead guest must be at least 18 years old.",
          "[Placeholder] Prices are shown before any payment and the server total is the amount you pay.",
        ],
      },
      { type: "h2", text: "Payment" },
      {
        type: "p",
        text: "[Placeholder] You can pay online, by bank transfer, or at the hotel depending on the rate you choose. Card payments are handled by our payment provider; we never store your card number.",
      },
      { type: "h2", text: "Changes and cancellations" },
      {
        type: "p",
        text: "[Placeholder] You can change or cancel a booking through the manage booking page or by contacting us. What you owe or get back depends on the cancellation policy shown on your booking.",
        links: [
          {
            label: "Read the cancellation policy",
            href: "/policies/cancellation-policy",
          },
        ],
      },
      { type: "h2", text: "Questions" },
      {
        type: "p",
        text: "[Placeholder] If anything here is unclear, contact us before you book and we will explain it.",
        links: [{ label: "Contact us", href: "/contact" }],
      },
    ],
    updatedAt: "2026-01-01",
    isPublished: true,
    metaTitle: "Terms of booking",
    metaDescription:
      "[Placeholder] The terms that apply when you book a room or apartment with us directly, including payment and changes.",
  },
  privacy: {
    slug: "privacy",
    title: "Privacy policy",
    summary:
      "What we do with your personal details, who we share them with, and the choices you have.",
    body: [
      {
        type: "p",
        text: "[Placeholder] This policy explains how we collect and use your personal data when you contact us or book a stay. It must be reviewed against the Nigeria Data Protection Act (NDPA) before launch and kept up to date.",
      },
      { type: "h2", text: "What we collect" },
      {
        type: "ul",
        items: [
          "[Placeholder] Your name, email address and phone number.",
          "[Placeholder] Your stay details: dates, number of guests and room type.",
          "[Placeholder] Payment information is handled by our payment provider and is not stored by us.",
        ],
      },
      { type: "h2", text: "Why we use it" },
      {
        type: "p",
        text: "[Placeholder] We use your details to manage your booking, contact you about your stay, reply to your enquiries and meet legal obligations. We do not sell your data.",
      },
      { type: "h2", text: "Who we share it with" },
      {
        type: "p",
        text: "[Placeholder] We share what is necessary with our payment provider and email provider to complete your booking and send confirmations. We never share more than is needed.",
      },
      { type: "h2", text: "How long we keep it" },
      {
        type: "p",
        text: "[Placeholder] We keep booking records for as long as needed for accounting and legal purposes, then delete or anonymise them.",
      },
      { type: "h2", text: "Your rights" },
      {
        type: "p",
        text: "[Placeholder] You can ask us to access, correct or delete your personal data, and you can object to how we use it. Contact us to make a request.",
        links: [{ label: "Contact us", href: "/contact" }],
      },
    ],
    updatedAt: "2026-01-01",
    isPublished: true,
    metaTitle: "Privacy policy",
    metaDescription:
      "[Placeholder] How we collect, use and protect your personal data when you book or contact us, and the rights you have.",
  },
  "cancellation-policy": {
    slug: "cancellation-policy",
    title: "Cancellation policy",
    summary:
      "When a cancellation is free, what you get back, and what happens if you do not arrive.",
    body: [
      {
        type: "p",
        text: "[Placeholder] The cancellation terms shown on your booking at the time you booked always apply to that booking. The summary below explains how our usual policy works.",
      },
      { type: "h2", text: "Free cancellation" },
      {
        type: "p",
        text: "[Placeholder] You can cancel free of charge up to the free-cancellation window before your arrival date. The exact deadline is shown on your booking confirmation.",
      },
      { type: "h2", text: "After the free window" },
      {
        type: "p",
        text: "[Placeholder] Once the free window has passed, a percentage of the stay is charged. The percentage and how a refund is worked out are shown on your booking when you manage it.",
      },
      { type: "h2", text: "Refunds" },
      {
        type: "p",
        text: "[Placeholder] Approved refunds are returned to the original payment method. How long it takes depends on your bank or card provider.",
      },
      { type: "h2", text: "If you do not arrive" },
      {
        type: "p",
        text: "[Placeholder] If you do not check in and have not cancelled, the booking is treated as a no-show and may be charged in full.",
      },
      { type: "h2", text: "How to cancel" },
      {
        type: "p",
        text: "[Placeholder] You can cancel through the manage booking page or by contacting us with your booking reference.",
        links: [
          { label: "Manage your booking", href: "/booking/manage" },
          { label: "Contact us", href: "/contact" },
        ],
      },
    ],
    updatedAt: "2026-01-01",
    isPublished: true,
    metaTitle: "Cancellation policy",
    metaDescription:
      "[Placeholder] When cancellation is free, what a refund covers, and what to do if your plans change.",
  },
  "house-rules": {
    slug: "house-rules",
    title: "House rules",
    summary:
      "Check-in and check-out times, and what we ask of you during your stay.",
    body: [
      {
        type: "p",
        text: "[Placeholder] These simple rules keep the building calm and safe for everyone. They are part of your booking.",
      },
      { type: "h2", text: "Arrival and departure" },
      {
        type: "p",
        text: "[Placeholder] Check-in is from the time shown below. Tell us your arrival time so we can expect you. Check-out is by the time shown below so we can prepare the room.",
      },
      { type: "h2", text: "During your stay" },
      {
        type: "ul",
        items: [
          "[Placeholder] Quiet hours are observed at night; please keep noise down.",
          "[Placeholder] Visitors may be asked to sign in at reception.",
          "[Placeholder] You are responsible for any damage to the room during your stay.",
        ],
      },
      { type: "h2", text: "Who can stay" },
      {
        type: "p",
        text: "[Placeholder] Only the guests named on the booking may stay overnight. Children and pets are welcome under the policies below.",
      },
    ],
    updatedAt: "2026-01-01",
    isPublished: true,
    metaTitle: "House rules",
    metaDescription:
      "[Placeholder] Check-in and check-out times and the simple house rules that apply during your stay.",
  },
};

/** All policies, in hub order. Only published rows are returned. */
export const getPolicyPages = async (f: PreviewFlags): Promise<PolicyPage[]> =>
  (
    await gate(
      f,
      "policies",
      POLICY_SLUGS.map((s) => policyPages[s]),
      [],
    )
  )
    .filter((p) => p.isPublished)
    .sort(
      (a, b) => POLICY_SLUGS.indexOf(a.slug) - POLICY_SLUGS.indexOf(b.slug),
    );

/** One policy, or null when the slug is unknown or the page is unpublished. */
export const getPolicyPage = async (
  slug: PolicySlug,
  f: PreviewFlags,
): Promise<PolicyPage | null> => {
  const page = policyPages[slug];
  if (!page) return null;
  const all = await getPolicyPages(f);
  return all.find((p) => p.slug === slug) ?? null;
};

/**
 * Structured policy facts for the cancellation and house-rules pages. Seeded from the
 * same values checkout uses so the two can never disagree.
 */
export const getPolicySettings = cache(
  (): PolicySettings => ({
    cancellation: {
      policyType: "flexible", // [placeholder] confirm with the hotel
      freeCancellationHours: roomHotelSettings.freeCancellationHours,
      refundPercentAfterWindow: 50, // [placeholder]
      noShowPolicy:
        "[Placeholder] If you do not arrive and have not cancelled, the booking may be charged in full.",
      refundTimelineDays: 7, // [placeholder] working days
    },
    houseRules: {
      checkInTime: roomHotelSettings.checkInTime,
      checkOutTime: roomHotelSettings.checkOutTime,
      petsAllowed: false, // [placeholder] set true if pets are welcome
      petsNote: roomHotelSettings.petsPolicy,
      smokingPolicy: "not_allowed", // [placeholder]
      smokingNote: roomHotelSettings.smokingPolicy,
      idRequiredAtCheckin: true, // [placeholder]
      childrenPolicy: roomHotelSettings.childrenPolicy,
      quietHours: "[Placeholder, e.g. 10:00 pm to 7:00 am]",
      visitorsNote:
        "[Placeholder] Visitors may be asked to sign in at reception.",
      damagesNote:
        "[Placeholder] Guests are responsible for any damage to the room during their stay.",
    },
  }),
);
