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

import { formatCountdown, formatDeadline, formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
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
            className="rounded-control size-20 shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="rounded-control bg-ink/10 size-20 shrink-0"
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-h3 line-clamp-2">{room.name}</h2>
          <p className="text-small text-muted-foreground mt-1">
            {room.bedConfig}
          </p>
        </div>
      </div>

      <dl className="text-small space-y-1.5">
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
          <dd>From {hotelTimes.checkIn}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">Check-out</dt>
          <dd>By {hotelTimes.checkOut}</dd>
        </div>
      </dl>
    </>
  );
}

/** The stay, the server's price breakdown, the cancellation deadline, the hold and the trust lines. */
export function SummaryCard({
  room,
  stay,
  quote,
  hotelTimes,
  hold,
  holdSeconds,
  confirmationMode,
}: SummaryProps) {
  const site = useSite();
  const guests = stay.adults + stay.children;
  const nights = quote?.breakdown.nights;

  return (
    <section
      aria-label="Your stay"
      className="rounded-card border-line bg-card shadow-float space-y-5 border p-5"
    >
      <StayFacts
        room={room}
        stay={stay}
        nights={nights}
        hotelTimes={hotelTimes}
      />

      <div className="border-line border-t pt-5" aria-busy={!quote}>
        {quote ? (
          <PriceBreakdown quote={{ ...quote.breakdown }} />
        ) : (
          <BreakdownSkeleton />
        )}
        {quote && guests > 0 && <p className="sr-only">For {guests} guests</p>}
      </div>

      {quote && (
        <div className="rounded-control bg-paper text-small p-4">
          <p className="font-semibold">
            {quote.policy.nonRefundable
              ? 'Non-refundable'
              : quote.policy.freeCancellationUntil
                ? `Free cancellation until ${formatDeadline(quote.policy.freeCancellationUntil)}`
                : quote.policy.note}
          </p>
          {quote.policy.freeCancellationUntil && (
            <p className="text-muted-foreground mt-1">
              After that, cancellation charges apply. See the Cancellation
              Policy.
            </p>
          )}
        </div>
      )}

      <div
        className={`rounded-control text-small flex items-center gap-3 border p-4 ${
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
          <p className="text-destructive font-semibold">
            Your hold has expired.
          </p>
        ) : (
          <p className={hold.expiring ? 'text-destructive font-semibold' : ''}>
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

      <ul className="text-small space-y-1.5">
        <li className="flex items-center gap-2">
          <Lock className="text-brand-ink size-4 shrink-0" aria-hidden />
          Secure payment
        </li>
        <li className="flex items-center gap-2">
          {confirmationMode === 'instant' ? (
            <>
              <BadgeCheck
                className="text-brand-ink size-4 shrink-0"
                aria-hidden
              />
              Instant confirmation
            </>
          ) : (
            <>
              <ShieldCheck
                className="text-brand-ink size-4 shrink-0"
                aria-hidden
              />
              Confirmed after hotel approval
            </>
          )}
        </li>
        <li>
          <a
            href={whatsappHref(
              site,
              `Hello, I need help with my booking for the ${room.name}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-brand inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-2 underline-offset-4"
          >
            <MessageCircle className="size-4" aria-hidden />
            Need help? Chat on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
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
        variant="outline"
        size="md"
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
              className="bg-ink/10 block h-5 w-28 rounded motion-safe:animate-pulse"
            />
          )}
          <span className="text-small text-muted-foreground block truncate">
            {props.room.name},{' '}
            {formatRange(props.stay.checkIn, props.stay.checkOut)}
          </span>
        </span>
        <span className="text-small decoration-brand inline-flex shrink-0 items-center gap-1 font-semibold underline decoration-2 underline-offset-4">
          View details <ChevronDown className="size-4" aria-hidden />
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="rounded-t-card border-line bg-paper text-ink max-h-[92dvh] gap-0 border-t p-0"
        >
          <SheetHeader className="border-line border-b px-5 py-2 pr-14">
            <SheetTitle className="font-display text-h3">
              Your booking
            </SheetTitle>
            <SheetDescription className="sr-only">
              Review the room, stay dates, and total price for this booking.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <SummaryCard {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
