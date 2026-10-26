'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, Search, Users } from 'lucide-react';
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
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';

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
    <Button
      variant="ghost"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`h-auto min-h-[4.5rem] w-full justify-start px-5 text-left ${
        expanded ? 'bg-paper' : ''
      } ${invalid ? 'ring-destructive ring-2 ring-inset' : ''} ${
        separator
          ? 'after:bg-line after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-px'
          : ''
      }`}
    >
      <span className="text-brand-ink">{icon}</span>
      <span className="min-w-0">
        <span className="text-caption text-muted-foreground block font-semibold">
          {label}
        </span>
        <span
          className={`block truncate ${value ? 'font-semibold' : 'text-muted-foreground'}`}
        >
          {value ?? placeholder}
        </span>
      </span>
    </Button>
  );
}

/**
 * Availability search. Desktop: one bar with date and guest pop-overs.
 * Mobile: one tappable card that opens a full-screen picker sheet.
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
  const lastTrigger = useRef<HTMLElement | null>(null);
  const guestsTrigger = useRef<HTMLButtonElement>(null);
  const ids = {
    dates: useId(),
    guests: useId(),
    error: useId(),
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
        className="rounded-card bg-card shadow-float ring-ink/10 relative hidden p-2 ring-1 md:block"
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
          <Button
            ref={guestsTrigger}
            variant="ghost"
            aria-expanded={panel === 'guests'}
            aria-controls={ids.guests}
            onClick={(e) => togglePanel('guests', e)}
            className={`h-auto min-h-[4.5rem] w-full justify-start px-5 text-left ${panel === 'guests' ? 'bg-paper' : ''}`}
          >
            <span className="text-brand-ink">
              <Users className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="text-caption text-muted-foreground block font-semibold">
                Guests
              </span>
              <span className="block truncate font-semibold">
                {guestSummary(search)}
              </span>
            </span>
          </Button>
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
            className="text-small text-destructive px-5 pt-3 pb-2 font-medium"
          >
            {error}
          </p>
        )}

        {panel === 'dates' && (
          <div
            id={ids.dates}
            role="group"
            aria-label="Choose your dates"
            className="rounded-card bg-card shadow-float ring-ink/10 absolute top-full left-0 z-30 mt-3 w-[44rem] max-w-full p-5 ring-1"
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
            className="rounded-card bg-card shadow-float ring-ink/10 absolute top-full right-0 z-30 mt-3 w-full max-w-sm p-5 ring-1"
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
        <Button
          variant="outline"
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
          className="shadow-float h-auto min-h-18 w-full justify-start gap-4 p-4 text-left"
        >
          <span className="bg-primary text-ink grid size-12 shrink-0 place-items-center rounded-full">
            <Search className="size-6" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Check availability</span>
            <span className="text-small text-muted-foreground block truncate">
              {summary ?? 'Add dates and guests'}
            </span>
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
                Check availability
              </SheetTitle>
              <SheetDescription className="sr-only">
                Choose your dates and guests, then search available rooms.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <DatePicker
                value={{ checkIn, checkOut }}
                onChange={setDates}
                monthsShown={1}
              />
              <div className="border-line mt-6 border-t">{guestPanel}</div>
            </div>

            <div className="border-line bg-card border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {error && (
                <p
                  role="alert"
                  className="text-small text-destructive mb-3 font-medium"
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
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
