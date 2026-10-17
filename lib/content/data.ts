import { cache } from "react";
import { getCheckoutSettings } from "../checkout/settings";
import type { ExtraItem } from "../checkout/types";
import { testimonials as sampleTestimonials } from "../data";
import { roomAmenityLabels, roomTypes, type RoomAmenityKey } from "../rooms";
import { site } from "../site";
import type { Testimonial } from "../types";
import { gate, type PreviewFlags } from "./preview";
import type {
  Facility,
  Faq,
  GalleryImageRecord,
  HotelSettings,
  NearbyAttraction,
  SitePage,
  SocialLink,
  TeamMember,
} from "./types";

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
