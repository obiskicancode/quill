'use client';

import { CalendarDays, Pencil, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatShort } from '@/lib/dates';
import {
  formatRange,
  guestSummary,
  MAX_ADULTS,
  MAX_CHILDREN,
  totalGuests,
} from '@/lib/rooms';
import type { DateRange } from '@/types/dates.types';
import type { RoomQuery } from '@/types/rooms.types';

import { DatePicker } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

interface StaySelectorProps {
  query: RoomQuery;
  /** Plain-language message when the dates in the URL are not usable. */
  problem: string | null;
  onChange: (patch: Partial<RoomQuery>) => void;
  /** Increment to open the date picker from elsewhere (for example a card's "Check availability"). */
  openSignal: number;
}

const field = 'h-auto min-h-[4rem] w-full justify-start gap-3 px-4 text-left';

/**
 * Sticky under the header. Reads from the URL and writes back to it, so dates and guests stay in sync with the list.
 * Desktop: three fields with pop-overs. Mobile: one summary chip that opens the full-screen picker.
 */
export function StaySelector({
  query,
  problem,
  onChange,
  openSignal,
}: StaySelectorProps) {
  const [panel, setPanel] = useState<'dates' | 'guests' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
  });
  const [sheetAdults, setSheetAdults] = useState(query.adults);
  const [sheetChildren, setSheetChildren] = useState(query.children);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const ids = { dates: useId(), guests: useId() };

  const { checkIn, checkOut } = query;
  const hasDates = Boolean(checkIn && checkOut);
  const guests = totalGuests(query);
  const chip =
    hasDates && checkIn && checkOut
      ? `${formatRange(checkIn, checkOut)}, ${guests} ${guests === 1 ? 'guest' : 'guests'}`
      : 'Add dates and guests';

  function openDates() {
    setDraft({ checkIn, checkOut });
    setPanel('dates');
  }

  function openSheet() {
    setDraft({ checkIn, checkOut });
    setSheetAdults(query.adults);
    setSheetChildren(query.children);
    setSheetError(null);
    setSheetOpen(true);
  }

  useEffect(() => {
    if (openSignal === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- openSignal is an imperative trigger from elsewhere on the page
    if (window.matchMedia('(min-width: 768px)').matches) openDates();
    else openSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    if (!panel) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanel(null);
        lastTrigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  function trigger(next: 'dates' | 'guests', e: MouseEvent<HTMLButtonElement>) {
    lastTrigger.current = e.currentTarget;
    if (panel === next) setPanel(null);
    else if (next === 'dates') openDates();
    else setPanel('guests');
  }

  function onDesktopDates(next: DateRange) {
    setDraft(next);
    if (next.checkIn && next.checkOut) {
      onChange({ checkIn: next.checkIn, checkOut: next.checkOut });
      setPanel(null);
    }
  }

  function applySheet() {
    if (draft.checkIn && !draft.checkOut) {
      setSheetError(ERROR_MESSAGES.CHOOSE_CHECKOUT_OR_CLEAR);
      return;
    }
    onChange({
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      adults: sheetAdults,
      children: sheetChildren,
    });
    setSheetOpen(false);
  }

  return (
    <div className="border-line bg-paper/95 sticky top-16 z-30 border-b py-3 backdrop-blur">
      <div className="container-page" ref={wrapRef}>
        {/* Desktop and tablet */}
        <div className="relative hidden md:block">
          <div
            role="group"
            aria-label="Your stay"
            className="rounded-card bg-card shadow-raised ring-ink/10 grid grid-cols-3 p-1.5 ring-1"
          >
            <Button
              variant="ghost"
              aria-expanded={panel === 'dates'}
              aria-controls={ids.dates}
              onClick={(e) => trigger('dates', e)}
              className={`${field} after:bg-line after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-[0.0625rem] ${panel === 'dates' ? 'bg-paper' : ''}`}
            >
              <CalendarDays className="text-brand-ink size-5" aria-hidden />
              <span>
                <span className="text-caption text-muted-foreground block font-semibold">
                  Check-in
                </span>
                <span
                  className={`block ${checkIn ? 'font-semibold' : 'text-muted-foreground'}`}
                >
                  {checkIn ? formatShort(checkIn) : 'Add date'}
                </span>
              </span>
            </Button>
            <Button
              variant="ghost"
              aria-expanded={panel === 'dates'}
              aria-controls={ids.dates}
              onClick={(e) => trigger('dates', e)}
              className={`${field} after:bg-line after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-[0.0625rem] ${panel === 'dates' ? 'bg-paper' : ''}`}
            >
              <CalendarDays className="text-brand-ink size-5" aria-hidden />
              <span>
                <span className="text-caption text-muted-foreground block font-semibold">
                  Check-out
                </span>
                <span
                  className={`block ${checkOut ? 'font-semibold' : 'text-muted-foreground'}`}
                >
                  {checkOut ? formatShort(checkOut) : 'Add date'}
                </span>
              </span>
            </Button>
            <Button
              variant="ghost"
              aria-expanded={panel === 'guests'}
              aria-controls={ids.guests}
              onClick={(e) => trigger('guests', e)}
              className={`${field} ${panel === 'guests' ? 'bg-paper' : ''}`}
            >
              <Users className="text-brand-ink size-5" aria-hidden />
              <span>
                <span className="text-caption text-muted-foreground block font-semibold">
                  Guests
                </span>
                <span className="block font-semibold">
                  {guestSummary(query)}
                </span>
              </span>
            </Button>
          </div>

          {panel === 'dates' && (
            <div
              id={ids.dates}
              role="group"
              aria-label="Choose your dates"
              className="rounded-card bg-card shadow-float ring-ink/10 absolute top-full left-0 z-30 mt-3 w-[44rem] max-w-full p-5 ring-1"
            >
              <DatePicker
                value={draft}
                onChange={onDesktopDates}
                monthsShown={2}
              />
              <div className="border-line mt-4 flex justify-end border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasDates && !draft.checkIn}
                  onClick={() => {
                    setDraft({ checkIn: null, checkOut: null });
                    onChange({ checkIn: null, checkOut: null });
                    setPanel(null);
                  }}
                >
                  Clear dates
                </Button>
              </div>
            </div>
          )}

          {panel === 'guests' && (
            <div
              id={ids.guests}
              role="group"
              aria-label="Choose guests"
              className="rounded-card bg-card shadow-float ring-ink/10 absolute top-full right-0 z-30 mt-3 w-full max-w-sm p-5 ring-1"
            >
              <div className="divide-line divide-y">
                <GuestStepper
                  label="Adults"
                  hint="Age 13 and over"
                  value={query.adults}
                  min={1}
                  max={MAX_ADULTS}
                  onChange={(adults) => onChange({ adults })}
                />
                <GuestStepper
                  label="Children"
                  hint="Age 0 to 12"
                  value={query.children}
                  min={0}
                  max={MAX_CHILDREN}
                  onChange={(children) => onChange({ children })}
                />
              </div>
              <Button
                variant="dark"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setPanel(null)}
              >
                Done
              </Button>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <Button
            variant="outline"
            aria-haspopup="dialog"
            onClick={openSheet}
            className="h-auto min-h-12 w-full justify-between rounded-full px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <CalendarDays
                className="text-brand-ink size-5 shrink-0"
                aria-hidden
              />
              <span className="truncate font-semibold">{chip}</span>
            </span>
            <span className="text-small inline-flex items-center gap-1 font-semibold">
              <Pencil className="size-4" aria-hidden />
              Edit
            </span>
          </Button>

          <Sheet
            open={sheetOpen}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setSheetOpen(false);
            }}
          >
            <SheetContent
              side="bottom"
              showCloseButton
              className="border-line bg-paper text-ink h-dvh max-h-none gap-0 rounded-none border-t p-0"
            >
              <SheetHeader className="border-line border-b px-5 py-2 pr-14">
                <SheetTitle className="font-display text-h3">
                  Your stay
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Choose check-in and check-out dates and the number of guests.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <DatePicker
                  value={draft}
                  onChange={(next) => {
                    setDraft(next);
                    setSheetError(null);
                  }}
                  monthsShown={1}
                />
                <div className="divide-line border-line mt-6 divide-y border-t">
                  <GuestStepper
                    label="Adults"
                    hint="Age 13 and over"
                    value={sheetAdults}
                    min={1}
                    max={MAX_ADULTS}
                    onChange={setSheetAdults}
                  />
                  <GuestStepper
                    label="Children"
                    hint="Age 0 to 12"
                    value={sheetChildren}
                    min={0}
                    max={MAX_CHILDREN}
                    onChange={setSheetChildren}
                  />
                </div>
              </div>
              <div className="border-line bg-card border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {sheetError && (
                  <p
                    role="alert"
                    className="text-small text-destructive mb-3 font-medium"
                  >
                    {sheetError}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    disabled={!draft.checkIn}
                    onClick={() => {
                      setDraft({ checkIn: null, checkOut: null });
                      setSheetError(null);
                    }}
                  >
                    Clear dates
                  </Button>
                  <Button size="lg" className="flex-1" onClick={applySheet}>
                    Apply
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {problem && (
          <p
            role="status"
            className="text-small text-destructive pt-2 font-medium"
          >
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
