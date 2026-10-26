'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, Search, Users, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { formatShort, nightsBetween, todayISO } from '@/lib/dates';
import {
  buildSearchHref,
  guestSummary,
  initialSearch,
  MAX_ADULTS,
  MAX_CHILDREN,
  validateSearch,
} from '@/lib/rooms';
import type { SearchState } from '@/types/site.types';

import { DatePicker, type DateRange } from './DatePicker';
import { GuestStepper } from './GuestStepper';
import { Button } from './ui/Button';

type Panel = 'dates' | 'guests' | null;

interface FieldButtonProps {
  label: string;
  value: string | null;
  placeholder: string;
  icon: ReactNode;
  expanded: boolean;
  controls: string;
  invalid?: boolean;
  separator?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

function FieldButton({
  label,
  value,
  placeholder,
  icon,
  expanded,
  controls,
  invalid,
  separator,
  onClick,
}: FieldButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`rounded-control hover:bg-paper active:bg-line/60 relative flex min-h-[4.5rem] items-center gap-3 px-5 text-left transition-colors ${
        expanded ? 'bg-paper' : ''
      } ${invalid ? 'ring-danger ring-2 ring-inset' : ''} ${
        separator
          ? 'after:bg-line after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-px'
          : ''
      }`}
    >
      <span className="text-accent-ink">{icon}</span>
      <span className="min-w-0">
        <span className="text-caption text-muted block font-semibold">
          {label}
        </span>
        <span
          className={`block truncate ${value ? 'font-semibold' : 'text-muted'}`}
        >
          {value ?? placeholder}
        </span>
      </span>
    </button>
  );
}

/**
 * Availability search. Desktop: one bar with date and guest pop-overs.
 * Mobile: one tappable card that opens a full-screen picker (native <dialog>, so focus is trapped and Esc closes it).
 * States: default, dates selected, invalid, loading.
 */
export function SearchBar() {
  const router = useRouter();
  const [search, setSearch] = useState<SearchState>(initialSearch);
  const [panel, setPanel] = useState<Panel>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const guestsTrigger = useRef<HTMLButtonElement>(null);
  const ids = {
    dates: useId(),
    guests: useId(),
    error: useId(),
    sheetTitle: useId(),
  };

  const { checkIn, checkOut } = search;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const dateError = error !== null && !error.startsWith('At least one adult');
  const summary =
    checkIn && checkOut
      ? `${formatShort(checkIn)} to ${formatShort(checkOut)}, ${guestSummary(search)}`
      : null;

  // Close desktop pop-overs on outside click or Escape.
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setPanel(null);
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

  // Drive the native dialog from state, and stop the page scrolling behind it.
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

  function setDates(next: DateRange) {
    setSearch((s) => ({ ...s, ...next }));
    setError(null);
    if (next.checkIn && next.checkOut && panel === 'dates') {
      setPanel(null);
      requestAnimationFrame(() => guestsTrigger.current?.focus());
    }
  }

  function togglePanel(
    next: Exclude<Panel, null>,
    e: MouseEvent<HTMLButtonElement>,
  ) {
    lastTrigger.current = e.currentTarget;
    setPanel((p) => (p === next ? null : next));
  }

  function submit() {
    const message = validateSearch(search, todayISO());
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(buildSearchHref('/rooms', search));
    });
  }

  const guestPanel = (
    <div className="divide-line divide-y">
      <GuestStepper
        label="Adults"
        hint="Age 13 and over"
        value={search.adults}
        min={1}
        max={MAX_ADULTS}
        onChange={(adults) => setSearch((s) => ({ ...s, adults }))}
      />
      <GuestStepper
        label="Children"
        hint="Age 0 to 12"
        value={search.children}
        min={0}
        max={MAX_CHILDREN}
        onChange={(children) => setSearch((s) => ({ ...s, children }))}
      />
    </div>
  );

  return (
    <div id="availability-search">
      {/* Desktop and tablet */}
      <form
        ref={formRef}
        noValidate
        aria-label="Check availability"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-card bg-surface shadow-float ring-ink/10 relative hidden p-2 ring-1 md:block"
      >
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch">
          <FieldButton
            label="Check-in"
            value={checkIn ? formatShort(checkIn) : null}
            placeholder="Add date"
            icon={<CalendarDays className="size-5" aria-hidden />}
            expanded={panel === 'dates'}
            controls={ids.dates}
            invalid={dateError && !checkIn}
            separator
            onClick={(e) => togglePanel('dates', e)}
          />
          <FieldButton
            label="Check-out"
            value={
              checkOut
                ? `${formatShort(checkOut)} (${nights} ${nights === 1 ? 'night' : 'nights'})`
                : null
            }
            placeholder="Add date"
            icon={<CalendarDays className="size-5" aria-hidden />}
            expanded={panel === 'dates'}
            controls={ids.dates}
            invalid={dateError && !checkOut}
            separator
            onClick={(e) => togglePanel('dates', e)}
          />
          <button
            ref={guestsTrigger}
            type="button"
            aria-expanded={panel === 'guests'}
            aria-controls={ids.guests}
            onClick={(e) => togglePanel('guests', e)}
            className={`rounded-control hover:bg-paper active:bg-line/60 relative flex min-h-[4.5rem] items-center gap-3 px-5 text-left transition-colors ${panel === 'guests' ? 'bg-paper' : ''}`}
          >
            <span className="text-accent-ink">
              <Users className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="text-caption text-muted block font-semibold">
                Guests
              </span>
              <span className="block truncate font-semibold">
                {guestSummary(search)}
              </span>
            </span>
          </button>
          <Button
            type="submit"
            size="lg"
            loading={isPending}
            icon={<Search className="size-5" aria-hidden />}
            className="ml-2 self-stretch px-8"
          >
            {isPending ? 'Searching' : 'Search'}
          </Button>
        </div>

        {error && (
          <p
            id={ids.error}
            role="alert"
            className="text-small text-danger px-5 pt-3 pb-2 font-medium"
          >
            {error}
          </p>
        )}

        {panel === 'dates' && (
          <div
            id={ids.dates}
            role="group"
            aria-label="Choose your dates"
            className="rounded-card bg-surface shadow-float ring-ink/10 absolute top-full left-0 z-30 mt-3 w-[44rem] max-w-full p-5 ring-1"
          >
            <DatePicker
              value={{ checkIn, checkOut }}
              onChange={setDates}
              monthsShown={2}
            />
            <div className="border-line mt-4 flex justify-end border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={!checkIn && !checkOut}
                onClick={() => setDates({ checkIn: null, checkOut: null })}
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
            className="rounded-card bg-surface shadow-float ring-ink/10 absolute top-full right-0 z-30 mt-3 w-full max-w-sm p-5 ring-1"
          >
            {guestPanel}
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
      </form>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
          className="rounded-card bg-surface shadow-float ring-ink/10 active:bg-paper flex min-h-[4.5rem] w-full items-center gap-4 p-4 text-left ring-1 transition-colors"
        >
          <span className="bg-accent text-ink grid size-12 shrink-0 place-items-center rounded-full">
            <Search className="size-6" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Check availability</span>
            <span className="text-small text-muted block truncate">
              {summary ?? 'Add dates and guests'}
            </span>
          </span>
        </button>

        <dialog
          ref={dialogRef}
          aria-labelledby={ids.sheetTitle}
          onClose={() => setSheetOpen(false)}
          className="bg-paper text-ink backdrop:bg-ink/60 m-0 h-dvh max-h-none w-screen max-w-none p-0 open:flex open:flex-col"
        >
          {sheetOpen && (
            <>
              <div className="border-line flex items-center justify-between border-b px-5 py-2">
                <h2 id={ids.sheetTitle} className="font-display text-h3">
                  Check availability
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSheetOpen(false)}
                  className="hover:bg-ink/10 grid size-11 place-items-center rounded-full"
                >
                  <X className="size-6" aria-hidden />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <DatePicker
                  value={{ checkIn, checkOut }}
                  onChange={setDates}
                  monthsShown={1}
                />
                <div className="border-line mt-6 border-t">{guestPanel}</div>
              </div>

              <div className="border-line bg-surface border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {error && (
                  <p
                    role="alert"
                    className="text-small text-danger mb-3 font-medium"
                  >
                    {error}
                  </p>
                )}
                <Button
                  size="lg"
                  loading={isPending}
                  onClick={submit}
                  icon={<Search className="size-5" aria-hidden />}
                  className="w-full"
                >
                  {isPending ? 'Searching' : 'Search'}
                </Button>
              </div>
            </>
          )}
        </dialog>
      </div>
    </div>
  );
}
