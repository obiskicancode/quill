# Divine Excellent Apartments: home page design spec

## 1. Rationale and layout concept (under 150 words)
Guests arrive on a phone, often on a weak connection, wanting one thing: a room for their dates. The page leads with a plain promise, then puts the availability search on the edge of the hero where a thumb can reach it. Deep slate carries the hero, amenities and footer; marigold is the single accent and marks every main action. Young Serif gives headings a warm, sturdy voice; Figtree keeps body text clear. Structure is kept honest: no numbering, no eyebrow labels, no decorative motion. The one memorable move is the search card straddling the hero and the page.

```
HERO (dark photo)  headline, sub, [Book Now] [WhatsApp]
 ┌──────── search card (overlaps hero edge) ────────┐
 └ trust signals
 Intro (text | photo)
 Rooms (cards, 1 / 2 / 3 / 4 columns)
 AMENITIES (dark)
 Gallery (asymmetric grid)
 Testimonials (centred quote)
 Location (details | map)
 CTA band (accent)  ·  FOOTER (dark)
```

## 2. Design tokens
All live in `app/globals.css` (CSS variables) and `tailwind.config.ts`.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| ink | #1C2126 | base, text, dark sections | 15.0:1 on paper |
| ink-soft | #2D353C | hover on dark | paper on it 11.5:1 |
| muted | #575F67 | secondary text | 6.0:1 on paper, 6.5:1 on white |
| paper | #F7F6F3 | page background | |
| surface | #FFFFFF | cards, fields | |
| line | #DDDAD3 | hairlines | decorative only |
| accent | #E8A317 | primary buttons, icon discs | ink on accent 7.5:1 |
| accent-hover / pressed | #DB9A12 / #C48310 | button states | ink on them 6.7:1 / 5.1:1 |
| accent-ink | #7A4D00 | accent used as text or icon on light | 6.7:1 on paper |
| whatsapp | #0F7A3E | WhatsApp button | white on it 5.4:1 |
| danger | #B3261E | errors | 6.5:1 on white |
| success | #1B7A46 | confirmations | 5.4:1 on white |

Focus ring: 3px ink on light, accent on dark sections (accent on ink 7.5:1).

**Type.** Headings: Young Serif (400). Body: Figtree. Scale: display `clamp(2.5rem, 1.7rem+3.6vw, 4.5rem)`/1.04; h2 `clamp(1.875rem, 1.45rem+1.8vw, 2.75rem)`/1.12; h3 1.375rem/1.3; body-lg 1.125rem/1.65; body 1rem/1.6; small 0.875rem; caption 0.75rem. Line length capped near 65 characters.

**Spacing.** 4px base (Tailwind default). Section padding 4rem mobile, 6rem from 768, 7rem from 1440. Page gutters 20 / 32 / 40px, max width 80rem.

**Radii.** control 12px (buttons, fields), card 20px, pill for icon buttons and dots.

**Shadows.** raised: soft 2-layer card shadow. float: larger, for the search card, pop-overs and hover.

**Breakpoints.** 390 (sm), 768 (md), 1024 (lg), 1440 (xl). Mobile-first.

## 3. Section spec

| # | Section | Desktop 1440 | Mobile 390 |
|---|---|---|---|
| 1 | Header | Fixed, 80px, compacts to 64px on scroll. Transparent over hero (white text), solid paper after 24px scroll. Logo, 6 links, phone number, Book Now. | Logo (wraps to 2 lines), call icon, Book Now (small), menu button. Menu opens a panel with links and a WhatsApp button. Esc closes. |
| 2 | Hero | 640 to 704px tall. Photo (optional silent video, tablet and up, pause button, off for Data Saver and reduced motion), dark gradient overlay, left-aligned headline (max 3xl), one-line sub, Book Now and Chat on WhatsApp side by side. | 544px min. Same content, buttons stacked full width. |
| 3 | Search | One 4-part bar overlapping hero by 48px: Check-in, Check-out, Guests, Search. Dates open a 2-month pop-over; guests open steppers. | One 72px+ card overlapping 40px. Tap opens a full-screen sheet: 1-month calendar, adult and child steppers, sticky Search button. |
| 3b | Trust strip | Centred row under the bar: Google reviews, Pay securely online, 24-hour power and security (Free cancellation off until confirmed). | 2 columns / 1 column. |
| 4 | Intro | 7/5 split: heading and two short paragraphs with "Learn more about us"; 4:5 photo right. | Stacked, text first. |
| 5 | Rooms | 4 cards in a row (3 cards: 3 columns). Each: photo carousel 4:3, name (2 lines max), bed type, max guests, 3 amenities with labels, price, View Details and Book. | One column. |
| 6 | Amenities | Dark band, 4 x 2 grid: accent icon disc, label, one line. "See all amenities". | 1 to 2 columns. |
| 7 | Gallery | 4-column grid, fixed row height: one large, one tall, two wide, two single. "View full gallery". Fewer than 6 photos falls back to a uniform grid. | 2 columns with the same pattern. |
| 8 | Testimonials | Centred serif quote, stars (with text label), name and stay type. Prev, pause, next, counter. Link to Google reviews when set. | Same, swipeable. Never auto-advances. |
| 9 | Location | Details left (address, reception hours, 2 landmarks, Get Directions, Call), map right (click to load). | Stacked. |
| 10 | CTA band | Accent band, heading and sentence left, Book Now (dark) and WhatsApp right. | Stacked. |
| 11 | Footer | 4 columns: brand and social, contact, explore, policies; copyright. | Stacked. Extra bottom padding clears the sticky bar. |
| – | WhatsApp FAB | 56px, bottom right. | Sits in the right gap of the sticky bar. |
| – | Sticky Book Now bar | Not shown. | Full width, hides while the search is on screen (IntersectionObserver). |

## 4. Component inventory and states

| Component | States |
|---|---|
| Button / ButtonLink | default, hover, focus-visible, pressed, disabled, loading (spinner, aria-busy). Variants: primary, dark, secondary, secondaryOnDark, whatsapp, ghost. |
| Header | top (transparent), scrolled (compact, solid), menu open, current page. |
| SearchBar | default, dates selected, invalid (message plus red outline), loading (Searching). Pop-over open or closed. |
| DatePicker | day: default, hover, focus, today, check-in, check-out, in range, disabled (past). Month nav disabled at limits. Arrow, Home, End, PageUp, PageDown keys. |
| GuestStepper | default, minimum (minus disabled), maximum (plus disabled). |
| RoomCard | default, hover/focus-within, price shown, price hidden ("Contact us for price"), no photos. |
| Carousel | first and last slide (arrow disabled), playing, paused, reduced motion, touch (no auto-advance). |
| AmenityItem | default. |
| GalleryGrid | six tiles, fewer tiles, image loading, image missing. |
| TestimonialCarousel | with or without rating and photo; hidden when empty. |
| MapCard | map not loaded, loaded, no address yet (Get Directions disabled). |
| CtaBand | default. |
| Footer | default. |
| WhatsAppFab | default, hover, pressed, focus. |
| StickyBookBar | visible, hidden. |
| Photo | loading skeleton, loaded, missing ("Photo coming soon"). |

## 5. Code
See the project: `app/`, `components/`, `lib/`. Run `npm install && npm run dev`. TypeScript passes; the build compiles and prerenders (fonts download from Google at build time).

## 6. Images to supply
Save as WebP (AVIF optional) in `public/images/`. Keep the subject in the middle 60%, since crops differ by screen. Aim for under 200 KB each.

| File | Size | Ratio | Notes |
|---|---|---|---|
| `hero.webp` | 2400 x 1350 | 16:9 | Shown full width; dark overlay is applied. |
| `/video/hero.mp4` (optional) | 1280 x 720, 8 to 12 s, under 3 MB | 16:9 | No audio track. Set in `site.hero.video`. |
| `intro.webp` | 1000 x 1250 | 4:5 | Reception or entrance. |
| `rooms/<slug>-1..8.webp` | 1200 x 900 | 4:3 | 1 to 8 per room. File names match `lib/data.ts`. |
| `gallery/gallery-1.webp` | 1800 x 1200 | 3:2 | Shown large (about 1.2:1). |
| `gallery/gallery-2.webp`, `-4.webp` | 1200 x 1200 | 1:1 | Small tiles. |
| `gallery/gallery-3.webp` | 1200 x 1800 | 2:3 | Tall tile, shown about 1:2.3. |
| `gallery/gallery-5.webp`, `-6.webp` | 2000 x 1000 | 2:1 | Wide tiles, subject on a centre band. |
| Testimonial photos (optional) | 160 x 160 | 1:1 | Shown at 56px. |
| Logo | SVG, plus 512 x 512 PNG | any | Set in `site.logo`. |
| `og.png` | 1200 x 630 | 1.91:1 | Social share image. |

## Before launch
Replace everything in [square brackets] and all sample quotes, prices and facilities. Do not publish sample reviews. Confirm the cancellation policy before turning on "Free cancellation".
