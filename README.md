# Divine Excellent Apartments: home page

Next.js (App Router), TypeScript, Tailwind CSS 3.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

## Where things live
- `app/globals.css` and `tailwind.config.ts`: every colour, radius, shadow and type size (design tokens). Rebrand here.
- `lib/site.ts`: hotel name, contact details, nav, trust signals, hero and intro copy. Items in [brackets] are placeholders.
- `lib/data.ts`: sample rooms, amenities, gallery and testimonials. Swap for database queries.
- `components/`: one file per component. `components/ui/` holds Button, Photo, TextLink, SectionHeading.

## Images
Drop files in `public/images/` (see the image list in DESIGN-SPEC.md). Missing files show a "Photo coming soon" placeholder, so the page never breaks.

## Routes this page links to
`/book` (receives `checkIn`, `checkOut`, `adults`, `children`, and `room` from a room card), `/rooms`, `/rooms/[slug]`, `/about`, `/amenities`, `/gallery`, `/contact`, `/enquiry`, `/policies`, `/policies/[slug]` (terms, privacy, cancellation-policy, house-rules).
