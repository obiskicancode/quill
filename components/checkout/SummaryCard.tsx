'use client';

import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Lock,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TextLink, textLinkRecipe } from '@/components/ui/text-link';
import {
  formatCountdown,
  formatDeadline,
  formatGuestTime,
  formatMinor,
} from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { cn } from '@/lib/utils';
import { useSite } from '@/providers/site.provider';
import type {
  CheckoutQuoteOk,
  ConfirmationMode,
  ReservationRoomSummary,
} from '@/types/checkout.types';

import {
  BreakdownSkeleton,
  PriceBreakdown,
} from '../room-detail/PriceBreakdown';
import { Button } from '../ui/button';
import { Photo } from '../ui/Photo';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

export interface HoldView {
  remainingMs: number | null;
  expiring: boolean;
  expired: boolean;
}

interface SummaryProps {
  room: ReservationRoomSummary;
  stay: { checkIn: string; checkOut: string; adults: number; children: number };
  /** null while the quote is loading. */
  quote: CheckoutQuoteOk | null;
  hotelTimes: { checkIn: string; checkOut: string };
  /** null until the reservation (and so the hold) exists. */
  hold: HoldView | null;
  holdSeconds: number;
  confirmationMode: ConfirmationMode;
}

/** Room photo and name, dates, guests and check-in/out times. Shared by checkout and the confirmation page. */
export function StayFacts({
  room,
  stay,
  nights,
  hotelTimes,
}: {
  room: ReservationRoomSummary;
  stay: {
    checkIn: string | null;
    checkOut: string | null;
    adults: number;
    children: number;
  };
  nights?: number;
  hotelTimes: { checkIn: string; checkOut: string };
}) {
  const row = 'flex justify-between gap-4';
  return (
    <>
      <div className="flex gap-4">
        {room.image ? (
          <Photo
            src={room.image.src}
            alt={room.image.alt}
            sizes="96px"
            className="size-20 shrink-0 rounded-control"
          />
        ) : (
          <div
            aria-hidden
            className="size-20 shrink-0 rounded-control bg-ink/10"
          />
        )}
        <div className="min-w-0">
          <h2 className="line-clamp-2 font-display text-h3">{room.name}</h2>
          <p className="mt-1 text-small text-muted-foreground">
            {room.bedConfig}
          </p>
        </div>
      </div>

      <dl className="space-y-1.5 text-small">
        <div className={row}>
          <dt className="text-muted-foreground">Dates</dt>
          <dd className="font-semibold">
            {stay.checkIn && stay.checkOut
              ? formatRange(stay.checkIn, stay.checkOut)
              : 'To be confirmed'}
            {nights ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">Guests</dt>
          <dd className="font-semibold">
            {stay.adults} {stay.adults === 1 ? 'adult' : 'adults'}
            {stay.children > 0
              ? `, ${stay.children} ${stay.children === 1 ? 'child' : 'children'}`
              : ''}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">Check-in</dt>
          <dd>From {formatGuestTime(hotelTimes.checkIn)}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">Check-out</dt>
          <dd>By {formatGuestTime(hotelTimes.checkOut)}</dd>
        </div>
      </dl>
    </>
  );
}

/**
 * What the stay costs and how much of the hold is left.
 *
 * The rail scrolls on a short laptop, so the two facts a guest is working
 * against disappear exactly when they are needed most: while the form below is
 * long. Pinned to the top of the card they stay in view; the same numbers are
 * spelled out below, so the strip is hidden from assistive tech.
 */
function PinnedTotals({ quote, hold }: Pick<SummaryProps, 'quote' | 'hold'>) {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 -mx-5 -mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-t-card border-b border-line bg-card px-5 pt-5 pb-3"
    >
      <p className="flex items-baseline gap-2">
        <span className="text-small text-muted-foreground">Total</span>
        {quote ? (
          <span className="font-display text-body-lg tabular-nums">
            {formatMinor(quote.breakdown.totalMinor)}
          </span>
        ) : (
          <span className="block h-6 w-24 rounded-sm bg-ink/10 motion-safe:animate-pulse" />
        )}
      </p>
      {hold && (
        <p
          className={`flex items-center gap-2 text-small ${
            hold.expired || hold.expiring
              ? 'font-semibold text-destructive'
              : 'text-brand-ink'
          }`}
        >
          <Clock className="size-4 shrink-0" />
          {hold.expired
            ? 'Hold expired'
            : hold.expiring
              ? `Hold ends ${formatCountdown(hold.remainingMs ?? 0)}`
              : `Room held ${formatCountdown(hold.remainingMs ?? 0)}`}
        </p>
      )}
    </div>
  );
}

/** The stay, the server's price breakdown, the cancellation deadline, the hold and the trust lines. */
export function SummaryCard({
  pinned = false,
  ...props
}: SummaryProps & {
  /** Keep the total and the hold countdown in view while the rail scrolls. */
  pinned?: boolean;
}) {
  const { room, stay, quote, hotelTimes, hold, holdSeconds, confirmationMode } =
    props;
  const site = useSite();
  const guests = stay.adults + stay.children;
  const nights = quote?.breakdown.nights;

  return (
    <section
      aria-label="Your stay"
      className="space-y-5 rounded-card border border-line bg-card p-5 shadow-float"
    >
      {pinned && <PinnedTotals {...props} />}

      <StayFacts
        room={room}
        stay={stay}
        nights={nights}
        hotelTimes={hotelTimes}
      />

      <div className="border-t border-line pt-5" aria-busy={!quote}>
        {quote ? (
          <PriceBreakdown quote={{ ...quote.breakdown }} />
        ) : (
          <BreakdownSkeleton />
        )}
        {quote && guests > 0 && <p className="sr-only">For {guests} guests</p>}
      </div>

      {quote && (
        <Alert variant="neutral" size="panel">
          <AlertTitle>
            {quote.policy.nonRefundable
              ? 'Non-refundable'
              : quote.policy.freeCancellationUntil
                ? `Free cancellation until ${formatDeadline(quote.policy.freeCancellationUntil)}`
                : quote.policy.note}
          </AlertTitle>
          {quote.policy.freeCancellationUntil && (
            <AlertDescription>
              After that, cancellation charges apply. See the Cancellation
              Policy.
            </AlertDescription>
          )}
        </Alert>
      )}

      <div
        className={`flex items-center gap-3 rounded-control border p-4 text-small ${
          hold?.expired
            ? 'border-destructive bg-destructive/5'
            : hold?.expiring
              ? 'border-destructive bg-destructive/5'
              : 'border-line'
        }`}
      >
        <Clock
          className={`size-5 shrink-0 ${hold?.expiring || hold?.expired ? 'text-destructive' : 'text-brand-ink'}`}
          aria-hidden
        />
        {!hold ? (
          <p>
            We will hold this room for you for {Math.round(holdSeconds / 60)}{' '}
            minutes once you continue.
          </p>
        ) : hold.expired ? (
          <p className="font-semibold text-destructive">
            Your hold has expired.
          </p>
        ) : (
          <p className={hold.expiring ? 'font-semibold text-destructive' : ''}>
            We&rsquo;re holding this room for you:{' '}
            <span
              className="font-display text-body-lg tabular-nums"
              aria-hidden
            >
              {formatCountdown(hold.remainingMs ?? 0)}
            </span>
            <span className="sr-only">
              {Math.ceil((hold.remainingMs ?? 0) / 60000)} minutes left
            </span>
          </p>
        )}
      </div>

      <ul className="space-y-1.5 text-small">
        <li className="flex items-center gap-2">
          <Lock className="size-4 shrink-0 text-brand-ink" aria-hidden />
          Secure payment
        </li>
        <li className="flex items-center gap-2">
          {confirmationMode === 'instant' ? (
            <>
              <BadgeCheck
                className="size-4 shrink-0 text-brand-ink"
                aria-hidden
              />
              Instant confirmation
            </>
          ) : (
            <>
              <ShieldCheck
                className="size-4 shrink-0 text-brand-ink"
                aria-hidden
              />
              Confirmed after hotel approval
            </>
          )}
        </li>
        <li>
          <TextLink
            href={whatsappHref(
              site,
              `Hello, I need help with my booking for the ${room.name}.`,
            )}
            external
            className="inline-flex items-center gap-2"
          >
            <MessageCircle className="size-4" aria-hidden />
            Need help? Chat on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </TextLink>
        </li>
      </ul>
    </section>
  );
}

/** Mobile: a collapsed "₦X total, View details" row that opens the full summary in a bottom sheet. */
export function MobileSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="h-auto w-full justify-between py-3"
      >
        <span className="min-w-0 text-left">
          {props.quote ? (
            <span className="font-semibold">
              {formatMinor(props.quote.breakdown.totalMinor)} total
            </span>
          ) : (
            <span
              aria-hidden
              className="block h-5 w-28 rounded-sm bg-ink/10 motion-safe:animate-pulse"
            />
          )}
          <span className="block truncate text-small text-muted-foreground">
            {props.room.name},{' '}
            {formatRange(props.stay.checkIn, props.stay.checkOut)}
          </span>
        </span>
        <span
          className={cn(
            textLinkRecipe,
            'inline-flex shrink-0 items-center gap-1 text-small',
          )}
        >
          View details <ChevronDown className="size-4" aria-hidden />
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          surface="paper"
          className="max-h-[92dvh] rounded-t-card"
        >
          <SheetHeader>
            <SheetTitle>Your booking</SheetTitle>
            <SheetDescription className="sr-only">
              Review the room, stay dates, and total price for this booking.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="pb-safe [--pb-safe-min:1.5rem]">
            <SummaryCard {...props} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
