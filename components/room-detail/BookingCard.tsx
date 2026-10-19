'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Lock,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { formatShort } from '@/lib/dates';
import { formatNaira } from '@/lib/format';
import { formatRange } from '@/lib/room-query';
import { site, whatsappHref } from '@/lib/site';
import {
  bookingHref,
  formatMinor,
  stayParams,
  type QuoteDemo,
  type StayInput,
  type StayPatch,
} from '@/types/stay.types';

import { DatePicker } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { Reveal } from '../motion/Reveal';
import { AvailabilityBadge } from '../rooms/AvailabilityBadge';
import { PriceBlock } from '../rooms/PriceBlock';
import { Button, ButtonLink } from '../ui/Button';
import { BreakdownSkeleton, PriceBreakdown } from './PriceBreakdown';
import { useQuote } from './useQuote';

export interface BookingRoom {
  slug: string;
  name: string;
  maxAdults: number;
  maxChildren: number;
  /** Guests above this need the extra bed. */
  baseGuests: number;
  showPrice: boolean;
  basePriceNgn: number;
  taxesIncluded: boolean;
  extraBed: { available: boolean; priceMinor: number | null };
}

interface BookingCardProps {
  room: BookingRoom;
  initial: StayInput;
  demo: QuoteDemo | null;
  bestPriceDirect: boolean;
}

/**
 * Sticky booking card (desktop) and bottom bar plus sheet (mobile). The price breakdown comes from the server;
 * this component only displays it. States: no dates, checking, available, low availability, sold out,
 * price hidden, rule violations (with a one-tap fix), error, and extra bed.
 */
export function BookingCard({
  room,
  initial,
  demo,
  bestPriceDirect,
}: BookingCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stay, setStay] = useState<StayInput>(initial);
  const [datesOpen, setDatesOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstRender = useRef(true);

  const guests = stay.adults + stay.children;
  const needsExtra = room.extraBed.available && guests > room.baseGuests;
  const complete = Boolean(stay.checkIn && stay.checkOut);
  const quoteInput = room.showPrice && complete ? stay : null;
  const { state, retry } = useQuote(room.slug, quoteInput, demo);
  const data = state.status === 'ready' ? state.data : null;

  const patch = (p: StayPatch) => setStay((s) => ({ ...s, ...p }));

  // Turn the extra bed on or off automatically as the guest count crosses the limit.
  const prevNeeds = useRef(needsExtra);
  useEffect(() => {
    if (prevNeeds.current !== needsExtra) {
      prevNeeds.current = needsExtra;
      setStay((s) => ({ ...s, extraBed: needsExtra }));
    }
  }, [needsExtra]);

  // Keep the URL in step so the page can be shared and the Ask card uses the current dates.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const p = stayParams(stay);
    if (needsExtra && !stay.extraBed) p.set('extraBed', '0');
    if (demo) p.set('demo', demo);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [stay, demo, needsExtra, pathname, router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (sheetOpen && !dialog.open) dialog.showModal();
    if (!sheetOpen && dialog.open) dialog.close();
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const available = data?.status === 'available' ? data : null;
  const soldOut = data?.status === 'sold-out' ? data : null;
  const invalid = data?.status === 'invalid' ? data : null;
  const onRequest = !room.showPrice || data?.status === 'on-request';
  const checking = state.status === 'checking';
  const failed = state.status === 'error';

  const dateText =
    stay.checkIn && stay.checkOut
      ? formatRange(stay.checkIn, stay.checkOut)
      : null;
  const nights = available?.quote.nights;
  const whatsappMessage = `Hello ${site.name}, I'd like to ask about the ${room.name}${dateText ? ` for ${dateText}` : ''}.`;

  const announce = checking
    ? 'Checking availability for your dates.'
    : available
      ? `Total ${formatMinor(available.quote.totalMinor)} for ${available.quote.nights} ${available.quote.nights === 1 ? 'night' : 'nights'}. ${available.quote.taxIncluded ? 'Taxes included.' : 'Taxes added to the total.'}`
      : soldOut
        ? 'Not available for these dates.'
        : invalid
          ? invalid.violations.map((v) => v.message).join(' ')
          : failed
            ? "We couldn't check availability."
            : '';

  const openDates = () => {
    setDatesOpen(true);
  };

  // --- the one primary action ---
  let primary: ReactNode;
  if (onRequest) {
    const p = new URLSearchParams({ room: room.slug, topic: 'price' });
    if (stay.checkIn && stay.checkOut) {
      p.set('checkIn', stay.checkIn);
      p.set('checkOut', stay.checkOut);
    }
    primary = (
      <ButtonLink
        href={`/contact?${p.toString()}`}
        size="lg"
        className="w-full"
      >
        Enquire
      </ButtonLink>
    );
  } else if (failed) {
    primary = (
      <Button size="lg" className="w-full" onClick={retry}>
        Retry
      </Button>
    );
  } else if (checking) {
    primary = (
      <Button size="lg" className="w-full" loading>
        Checking availability
      </Button>
    );
  } else if (available) {
    primary = (
      <ButtonLink
        href={bookingHref(site.bookingHref, room.slug, stay)}
        size="lg"
        className="w-full"
      >
        Book Now
      </ButtonLink>
    );
  } else if (invalid) {
    primary = (
      <Button size="lg" className="w-full" disabled>
        Book Now
      </Button>
    );
  } else if (soldOut) {
    primary = null;
  } else {
    primary = (
      <Button size="lg" className="w-full" onClick={openDates}>
        Check availability
      </Button>
    );
  }

  const guestsControls = (
    <div className="divide-y divide-line border-y border-line">
      <GuestStepper
        label="Adults"
        hint={`Up to ${room.maxAdults}`}
        value={stay.adults}
        min={1}
        max={room.maxAdults}
        onChange={(adults) => patch({ adults })}
      />
      <GuestStepper
        label="Children"
        hint={`Up to ${room.maxChildren}`}
        value={stay.children}
        min={0}
        max={room.maxChildren}
        onChange={(children) => patch({ children })}
      />
    </div>
  );

  const extraBedControl = needsExtra ? (
    <div className="flex items-start justify-between gap-4 rounded-control bg-paper p-4">
      <div>
        <p id="extra-bed-label" className="font-semibold">
          Extra bed
        </p>
        <p className="text-small text-muted">
          {guests} guests need one.{' '}
          {room.extraBed.priceMinor
            ? `${formatMinor(room.extraBed.priceMinor)} per night.`
            : 'No charge.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={stay.extraBed}
        aria-labelledby="extra-bed-label"
        onClick={() => patch({ extraBed: !stay.extraBed })}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${stay.extraBed ? 'border-ink bg-ink' : 'border-ink/60 bg-surface'}`}
      >
        <span
          className={`inline-block size-5 rounded-full transition-transform ${stay.extraBed ? 'translate-x-6 bg-paper' : 'translate-x-1 bg-ink'}`}
        />
      </button>
    </div>
  ) : !room.extraBed.available ? (
    <p className="text-small text-muted">
      No extra bed is available in this room. It sleeps up to {room.baseGuests}{' '}
      guests.
    </p>
  ) : null;

  const resultArea = (() => {
    if (!room.showPrice) return null;
    if (state.status === 'idle')
      return (
        <p className="text-small text-muted">
          Add your dates to see the total for your stay.
        </p>
      );
    if (checking) return <BreakdownSkeleton />;
    if (failed) {
      return (
        <div
          role="alert"
          className="rounded-control border border-danger/40 p-4"
        >
          <p className="font-semibold">We couldn&rsquo;t check availability</p>
          <p className="mt-1 text-small text-muted">
            Your dates and guests are saved. Please try again.
          </p>
        </div>
      );
    }
    if (available) return <PriceBreakdown quote={available.quote} />;
    if (soldOut) {
      return (
        <div>
          <p className="font-semibold">Not available for these dates</p>
          {soldOut.suggestions.length > 0 ? (
            <>
              <p className="mt-1 text-small text-muted">
                Nearby dates that are free:
              </p>
              <ul className="mt-3 space-y-2">
                {soldOut.suggestions.map((s) => (
                  <li key={s.checkIn}>
                    <button
                      type="button"
                      onClick={() =>
                        patch({ checkIn: s.checkIn, checkOut: s.checkOut })
                      }
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-ink/60 px-4 text-small font-semibold transition-colors hover:bg-ink hover:text-paper"
                    >
                      <span>{formatRange(s.checkIn, s.checkOut)}</span>
                      <span className="tabular-nums">
                        {formatMinor(s.totalMinor)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-small text-muted">
              No nearby dates are free. Message us and we will look for options.
            </p>
          )}
          <p className="mt-3 text-small">
            <a
              href="#similar-rooms"
              onClick={() => setSheetOpen(false)}
              className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4"
            >
              See similar rooms
            </a>
          </p>
        </div>
      );
    }
    if (invalid) {
      return (
        <ul className="space-y-4">
          {invalid.violations.map((v) => (
            <li
              key={v.code}
              className="rounded-control border border-danger/40 p-4"
            >
              <p className="text-small font-medium text-danger">{v.message}</p>
              {v.fix && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => patch(v.fix!.patch)}
                >
                  {v.fix.label}
                </Button>
              )}
            </li>
          ))}
        </ul>
      );
    }
    return null;
  })();

  const panel = (
    <div className="space-y-5">
      <div className="min-h-[5.5rem]">
        {available ? (
          <div>
            <p>
              <span className="font-display text-2xl">
                {formatMinor(available.quote.averageNightlyMinor)}
              </span>
              <span className="text-small text-muted"> / night on average</span>
            </p>
            <p className="mt-1 text-small text-muted">
              for {nights} {nights === 1 ? 'night' : 'nights'}
            </p>
            <div className="mt-2">
              <AvailabilityBadge remaining={available.remaining} />
            </div>
          </div>
        ) : (
          <div>
            <PriceBlock room={room} availability={null} />
            {soldOut && (
              <div className="mt-2">
                <AvailabilityBadge soldOut />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          aria-expanded={datesOpen}
          onClick={() => setDatesOpen((o) => !o)}
          className="flex min-h-14 w-full items-center gap-3 rounded-control border border-ink/60 bg-surface px-4 text-left transition-colors hover:bg-paper"
        >
          <CalendarDays
            className="size-5 shrink-0 text-accent-ink"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-caption font-semibold text-muted">
              Dates
            </span>
            <span
              className={`block truncate ${dateText ? 'font-semibold' : 'text-muted'}`}
            >
              {dateText
                ? `${dateText}${nights ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}`
                : stay.checkIn
                  ? `${formatShort(stay.checkIn)}, choose check-out`
                  : 'Add dates'}
            </span>
          </span>
        </button>
        {datesOpen && (
          <div className="mt-3 rounded-control border border-line p-3">
            <DatePicker
              value={{ checkIn: stay.checkIn, checkOut: stay.checkOut }}
              onChange={(next) => {
                patch(next);
                if (next.checkIn && next.checkOut) setDatesOpen(false);
              }}
              monthsShown={1}
            />
          </div>
        )}
      </div>

      {guestsControls}
      {extraBedControl}

      <div aria-hidden={false}>{resultArea}</div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>

      <div className="space-y-3">
        {primary}
        <ButtonLink
          href={whatsappHref(whatsappMessage)}
          external
          variant="secondary"
          className="w-full"
          icon={<MessageCircle className="size-5" aria-hidden />}
        >
          Ask on WhatsApp
        </ButtonLink>
      </div>

      <ul className="space-y-1 text-small">
        <li className="flex items-center gap-2">
          <Lock className="size-4 shrink-0 text-accent-ink" aria-hidden />
          Pay securely online
        </li>
        {available?.quote.freeCancellationUntil && (
          <li className="flex items-center gap-2">
            <BadgeCheck
              className="size-4 shrink-0 text-accent-ink"
              aria-hidden
            />
            Free cancellation until{' '}
            {formatShort(available.quote.freeCancellationUntil)}
          </li>
        )}
        {bestPriceDirect && (
          <li className="flex items-center gap-2">
            <ShieldCheck
              className="size-4 shrink-0 text-accent-ink"
              aria-hidden
            />
            Best price when you book direct
          </li>
        )}
      </ul>
    </div>
  );

  // --- mobile bar summary ---
  const barPrice = available
    ? `${formatMinor(available.quote.totalMinor)} for ${available.quote.nights} ${available.quote.nights === 1 ? 'night' : 'nights'}`
    : checking
      ? 'Checking availability'
      : soldOut
        ? 'Not available'
        : invalid
          ? 'Check your dates'
          : failed
            ? 'Prices unavailable'
            : onRequest
              ? 'Contact us for price'
              : `From ${formatNaira(room.basePriceNgn)} / night`;
  const barLabel = onRequest
    ? 'Enquire'
    : available
      ? 'Book'
      : state.status === 'idle'
        ? 'Check availability'
        : 'View';

  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-card border border-line bg-surface p-6 shadow-float lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        <Reveal>{panel}</Reveal>
      </div>

      {/* Mobile and tablet bar. It carries the id the global Book Now bar watches, so the two never stack. */}
      <div
        id="availability-search"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[5.5rem] pt-3 backdrop-blur lg:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{barPrice}</p>
            {dateText && (
              <p className="truncate text-small text-muted">
                {dateText}, {guests} {guests === 1 ? 'guest' : 'guests'}
              </p>
            )}
          </div>
          <Button
            size="md"
            className="shrink-0"
            onClick={() => {
              setSheetOpen(true);
              if (state.status === 'idle' && room.showPrice) setDatesOpen(true);
            }}
          >
            {barLabel}
          </Button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="booking-sheet-title"
        onClose={() => setSheetOpen(false)}
        className="inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col lg:hidden"
      >
        {sheetOpen && (
          <div className="animate-sheet-rise flex max-h-[92dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-card bg-paper">
            <div className="flex items-center justify-between border-b border-line px-5 py-2">
              <h2 id="booking-sheet-title" className="font-display text-h3">
                Your stay
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
                className="grid size-11 place-items-center rounded-full hover:bg-ink/10"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {panel}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
