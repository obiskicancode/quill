'use client';

import { CalendarDays, Pencil, Users, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';

import { formatShort } from '@/lib/dates';
import {
  formatRange,
  guestSummary,
  MAX_ADULTS,
  MAX_CHILDREN,
  totalGuests,
  type RoomQuery,
} from '@/lib/rooms';

import { DatePicker, type DateRange } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { Button } from '../ui/Button';

interface StaySelectorProps {
  query: RoomQuery;
  /** Plain-language message when the dates in the URL are not usable. */
  problem: string | null;
  onChange: (patch: Partial<RoomQuery>) => void;
  /** Increment to open the date picker from elsewhere (for example a card's "Check availability"). */
  openSignal: number;
}

const field =
  'relative flex min-h-[4rem] items-center gap-3 rounded-control px-4 text-left transition-colors hover:bg-paper active:bg-line/60';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const ids = { dates: useId(), guests: useId(), title: useId() };

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
      setSheetError('Choose a check-out date, or clear the dates.');
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
    <div className="sticky top-16 z-30 border-b border-line bg-paper/95 py-3 backdrop-blur">
      <div className="container-page" ref={wrapRef}>
        {/* Desktop and tablet */}
        <div className="relative hidden md:block">
          <div
            role="group"
            aria-label="Your stay"
            className="grid grid-cols-3 rounded-card bg-surface p-1.5 shadow-raised ring-1 ring-ink/10"
          >
            <button
              type="button"
              aria-expanded={panel === 'dates'}
              aria-controls={ids.dates}
              onClick={(e) => trigger('dates', e)}
              className={`${field} after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-line ${panel === 'dates' ? 'bg-paper' : ''}`}
            >
              <CalendarDays className="size-5 text-accent-ink" aria-hidden />
              <span>
                <span className="block text-caption font-semibold text-muted">
                  Check-in
                </span>
                <span
                  className={`block ${checkIn ? 'font-semibold' : 'text-muted'}`}
                >
                  {checkIn ? formatShort(checkIn) : 'Add date'}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-expanded={panel === 'dates'}
              aria-controls={ids.dates}
              onClick={(e) => trigger('dates', e)}
              className={`${field} after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-line ${panel === 'dates' ? 'bg-paper' : ''}`}
            >
              <CalendarDays className="size-5 text-accent-ink" aria-hidden />
              <span>
                <span className="block text-caption font-semibold text-muted">
                  Check-out
                </span>
                <span
                  className={`block ${checkOut ? 'font-semibold' : 'text-muted'}`}
                >
                  {checkOut ? formatShort(checkOut) : 'Add date'}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-expanded={panel === 'guests'}
              aria-controls={ids.guests}
              onClick={(e) => trigger('guests', e)}
              className={`${field} ${panel === 'guests' ? 'bg-paper' : ''}`}
            >
              <Users className="size-5 text-accent-ink" aria-hidden />
              <span>
                <span className="block text-caption font-semibold text-muted">
                  Guests
                </span>
                <span className="block font-semibold">
                  {guestSummary(query)}
                </span>
              </span>
            </button>
          </div>

          {panel === 'dates' && (
            <div
              id={ids.dates}
              role="group"
              aria-label="Choose your dates"
              className="absolute left-0 top-full z-30 mt-3 w-[44rem] max-w-full rounded-card bg-surface p-5 shadow-float ring-1 ring-ink/10"
            >
              <DatePicker
                value={draft}
                onChange={onDesktopDates}
                monthsShown={2}
              />
              <div className="mt-4 flex justify-end border-t border-line pt-4">
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
              className="absolute right-0 top-full z-30 mt-3 w-full max-w-sm rounded-card bg-surface p-5 shadow-float ring-1 ring-ink/10"
            >
              <div className="divide-y divide-line">
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
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={openSheet}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-full border border-ink/60 bg-surface px-5 text-left transition-colors active:bg-paper"
          >
            <span className="flex min-w-0 items-center gap-3">
              <CalendarDays
                className="size-5 shrink-0 text-accent-ink"
                aria-hidden
              />
              <span className="truncate font-semibold">{chip}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-small font-semibold">
              <Pencil className="size-4" aria-hidden />
              Edit
            </span>
          </button>

          <dialog
            ref={dialogRef}
            aria-labelledby={ids.title}
            onClose={() => setSheetOpen(false)}
            className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col"
          >
            {sheetOpen && (
              <div className="animate-sheet-rise flex h-full w-full flex-col bg-paper">
                <div className="flex items-center justify-between border-b border-line px-5 py-2">
                  <h2 id={ids.title} className="font-display text-h3">
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
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <DatePicker
                    value={draft}
                    onChange={(next) => {
                      setDraft(next);
                      setSheetError(null);
                    }}
                    monthsShown={1}
                  />
                  <div className="mt-6 divide-y divide-line border-t border-line">
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
                <div className="border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                  {sheetError && (
                    <p
                      role="alert"
                      className="mb-3 text-small font-medium text-danger"
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
              </div>
            )}
          </dialog>
        </div>

        {problem && (
          <p role="status" className="pt-2 text-small font-medium text-danger">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
