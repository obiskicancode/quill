'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Lock,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ActionBarSummary,
  MobileActionBar,
} from '@/components/ui/mobile-action-bar';
import { textLinkClasses } from '@/components/ui/text-link';
import { AVAILABILITY_SEARCH_ID } from '@/constants/content';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useQuote } from '@/hooks/services/guest/use-room-quote';
import { bookingHref, stayParams } from '@/lib/booking/links';
import { formatShort } from '@/lib/dates';
import { formatMinor, formatNaira } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { RoomBookingSummary } from '@/types/checkout.types';
import type { StayInput, StayPatch } from '@/types/stay.types';

import { DatePicker } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { Reveal } from '../motion/Reveal';
import { AvailabilityBadge } from '../rooms/AvailabilityBadge';
import { PriceBlock } from '../rooms/PriceBlock';
import { Button, ButtonLink } from '../ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import { BreakdownSkeleton, PriceBreakdown } from './PriceBreakdown';

interface BookingCardProps {
  room: RoomBookingSummary;
  initial: StayInput;
  bestPriceDirect: boolean;
}

type Scope = 'rail' | 'sheet';

/**
 * Room-detail booking card: date/guest selection, live quote, policy summary
 * and the handoff to checkout.
 */
export function BookingCard({
  room,
  initial,
  bestPriceDirect,
}: BookingCardProps) {
  const site = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const uid = useId();
  const [stay, setStay] = useState<StayInput>(initial);
  const [datesOpen, setDatesOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const firstRender = useRef(true);

  const guests = stay.adults + stay.children;
  const needsExtra = room.extraBed.available && guests > room.baseGuests;
  const complete = Boolean(stay.checkIn && stay.checkOut);
  const quoteInput = room.showPrice && complete ? stay : null;
  const { state, retry } = useQuote(room.slug, quoteInput);
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
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [stay, needsExtra, pathname, router]);

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
        ? ERROR_MESSAGES.NOT_AVAILABLE_FOR_DATES
        : invalid
          ? invalid.violations.map((v) => v.message).join(' ')
          : failed
            ? ERROR_MESSAGES.COULD_NOT_CHECK_AVAILABILITY
            : '';

  const openDates = () => {
    setDatesOpen(true);
  };

  const showViolations = () => {
    const lists = Array.from(
      document.querySelectorAll<HTMLElement>('[data-violations]'),
    );
    const list =
      lists.find((l) => l.getBoundingClientRect().height > 0) ?? lists[0];
    const item = list?.querySelector<HTMLElement>('[data-violation]');
    if (!item) return;
    item.scrollIntoView({ block: 'center' });
    item.focus({ preventScroll: true });
  };

  // --- the one primary action ---
  let primary: ReactNode;
  if (onRequest) {
    const p = new URLSearchParams({
      room: room.slug,
      topic: 'booking_enquiry',
    });
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
      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={showViolations}
      >
        See what to change
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
        unit={{ one: 'adult', many: 'adults' }}
        hint={`Up to ${room.maxAdults}`}
        value={stay.adults}
        min={1}
        max={room.maxAdults}
        onChange={(adults) => patch({ adults })}
      />
      <GuestStepper
        label="Children"
        unit={{ one: 'child', many: 'children' }}
        hint={`Up to ${room.maxChildren}`}
        value={stay.children}
        min={0}
        max={room.maxChildren}
        onChange={(children) => patch({ children })}
      />
    </div>
  );

  const extraBedControl = (scope: Scope) =>
    needsExtra ? (
      <div className="flex items-start justify-between gap-4 rounded-control bg-paper p-4">
        <div>
          <p id={`${uid}-${scope}-extra-bed`} className="font-semibold">
            Extra bed
          </p>
          <p className="text-small text-muted-foreground">
            {guests} guests need one.{' '}
            {room.extraBed.priceMinor
              ? `${formatMinor(room.extraBed.priceMinor)} per night.`
              : 'No charge.'}
          </p>
        </div>
        <Switch
          checked={stay.extraBed}
          onCheckedChange={(checked) => patch({ extraBed: checked })}
          aria-labelledby={`${uid}-${scope}-extra-bed`}
          className="mt-1"
        />
      </div>
    ) : !room.extraBed.available ? (
      <p className="text-small text-muted-foreground">
        No extra bed is available in this room. It sleeps up to{' '}
        {room.baseGuests} guests.
      </p>
    ) : null;

  const resultArea = (scope: Scope) => {
    if (!room.showPrice) return null;
    if (state.status === 'idle')
      return (
        <p className="text-small text-muted-foreground">
          Add your dates to see the total for your stay.
        </p>
      );
    if (checking) return <BreakdownSkeleton />;
    if (failed) {
      return (
        <Alert variant="destructive" role="alert">
          <AlertTitle className="font-semibold">
            We couldn&rsquo;t check availability
          </AlertTitle>
          <AlertDescription>
            Your dates and guests are saved. Please try again.
          </AlertDescription>
        </Alert>
      );
    }
    if (available) return <PriceBreakdown quote={available.quote} />;
    if (soldOut) {
      return (
        <div>
          <p className="font-semibold">Not available for these dates</p>
          {soldOut.suggestions.length > 0 ? (
            <>
              <p className="mt-1 text-small text-muted-foreground">
                Nearby dates that are free:
              </p>
              <ul className="mt-3 space-y-2">
                {soldOut.suggestions.map((s) => (
                  <li key={s.checkIn}>
                    <Button
                      variant="secondary"
                      className="w-full justify-between"
                      onClick={() =>
                        patch({ checkIn: s.checkIn, checkOut: s.checkOut })
                      }
                    >
                      <span>{formatRange(s.checkIn, s.checkOut)}</span>
                      <span className="tabular-nums">
                        {formatMinor(s.totalMinor)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-small text-muted-foreground">
              No nearby dates are free. Message us and we will look for options.
            </p>
          )}
          <p className="mt-3 text-small">
            <a
              href="#similar-rooms"
              onClick={() => setSheetOpen(false)}
              className={textLinkClasses}
            >
              See similar rooms
            </a>
          </p>
        </div>
      );
    }
    if (invalid) {
      return (
        <ul data-violations={scope} className="space-y-4">
          {invalid.violations.map((v) => (
            <li
              key={v.code}
              data-violation
              tabIndex={-1}
              className="rounded-control focus:ring-2 focus:ring-ring"
            >
              <Alert variant="destructive">
                <AlertTitle>{v.message}</AlertTitle>
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
              </Alert>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  const panel = (scope: Scope) => (
    <div className="space-y-5">
      <div className="min-h-22">
        {available ? (
          <div>
            <p>
              <span className="font-display text-figure">
                {formatMinor(available.quote.averageNightlyMinor)}
              </span>
              <span className="text-small text-muted-foreground">
                {' '}
                / night on average
              </span>
            </p>
            <p className="mt-1 text-small text-muted-foreground">
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
        <Button
          variant="secondary"
          aria-expanded={datesOpen}
          onClick={() => setDatesOpen((o) => !o)}
          className="h-auto min-h-14 w-full items-center justify-start gap-3 px-4 text-left font-normal"
        >
          <CalendarDays
            className="size-5 shrink-0 text-brand-ink"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-caption font-semibold text-muted-foreground">
              Dates
            </span>
            <span
              className={`block truncate ${dateText ? 'font-semibold' : 'text-muted-foreground'}`}
            >
              {dateText
                ? `${dateText}${nights ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}`
                : stay.checkIn
                  ? `${formatShort(stay.checkIn)}, choose check-out`
                  : 'Add dates'}
            </span>
          </span>
        </Button>
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
      {extraBedControl(scope)}

      <div>{resultArea(scope)}</div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>

      <ul className="space-y-1 text-small">
        <li className="flex items-center gap-2">
          <Lock className="size-4 shrink-0 text-brand-ink" aria-hidden />
          Pay securely online
        </li>
        {available?.quote.freeCancellationUntil && (
          <li className="flex items-center gap-2">
            <BadgeCheck
              className="size-4 shrink-0 text-brand-ink"
              aria-hidden
            />
            Free cancellation until{' '}
            {formatShort(available.quote.freeCancellationUntil)}
          </li>
        )}
        {bestPriceDirect && (
          <li className="flex items-center gap-2">
            <ShieldCheck
              className="size-4 shrink-0 text-brand-ink"
              aria-hidden
            />
            Best price when you book direct
          </li>
        )}
      </ul>
    </div>
  );

  const actions = (
    <div className="space-y-3">
      {primary}
      <ButtonLink
        href={whatsappHref(site, whatsappMessage)}
        external
        variant="secondary"
        className="w-full"
        icon={<MessageCircle className="size-5" aria-hidden />}
      >
        Ask on WhatsApp
      </ButtonLink>
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
            ? ERROR_MESSAGES.PRICES_UNAVAILABLE
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
      <div className="sticky-under-header hidden rounded-card border border-line bg-card p-6 shadow-float lg:block">
        <Reveal>{panel('rail')}</Reveal>
        <div className="sticky bottom-0 -mx-6 -mb-6 rounded-b-card border-t border-line bg-card px-6 pt-4 pb-6">
          {actions}
        </div>
      </div>

      <MobileActionBar id={AVAILABILITY_SEARCH_ID}>
        <ActionBarSummary
          primary={barPrice}
          secondary={
            dateText &&
            `${dateText}, ${guests} ${guests === 1 ? 'guest' : 'guests'}`
          }
        />
        <Button
          className="shrink-0"
          onClick={() => {
            setSheetOpen(true);
            if (state.status === 'idle' && room.showPrice) setDatesOpen(true);
          }}
        >
          {barLabel}
        </Button>
      </MobileActionBar>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          surface="paper"
          className="max-h-[92dvh] rounded-t-card lg:hidden"
        >
          <SheetHeader>
            <SheetTitle>Your stay</SheetTitle>
            <SheetDescription className="sr-only">
              Choose your dates and guests before booking this room.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>{panel('sheet')}</SheetBody>
          <SheetFooter className="border-t border-line bg-paper pb-safe">
            {actions}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
