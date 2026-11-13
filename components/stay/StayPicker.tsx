'use client';

import { CalendarDays, Pencil, Search, Users } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

import { DatePicker } from '@/components/DatePicker';
import { GuestStepper } from '@/components/GuestStepper';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { IconBadge } from '@/components/ui/icon-badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AVAILABILITY_SEARCH_ID } from '@/constants/content';
import { formatShort, todayISO } from '@/lib/dates';
import {
  formatRange,
  guestSummary,
  MAX_ADULTS,
  MAX_CHILDREN,
} from '@/lib/rooms';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/dates.types';
import type { SearchState } from '@/types/site.types';

type Owner = 'checkIn' | 'checkOut' | 'guests' | null;

export interface StayPickerProps {
  variant: 'hero' | 'rail';
  value: SearchState;
  onChange: (patch: Partial<SearchState>) => void;
  onSubmit?: (next: SearchState) => string | null;
  isPending?: boolean;
  problem?: string | null;
  openSignal?: number;
}

const sheetSnapPoints = [0.6, 1];

const panelFrame =
  'gap-0 w-176 max-w-[calc(100vw-2.5rem)] rounded-card bg-card p-5 text-body shadow-float ring-1 ring-ink/10';

interface OwnFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  icon: ReactNode;
  open: boolean;
  active?: boolean;
  invalid: boolean;
  describedBy?: string;
  separator?: boolean;
  dense: boolean;
}

type StayFieldProps = Omit<ComponentProps<typeof Button>, keyof OwnFieldProps> &
  OwnFieldProps;

function StayField({
  label,
  value,
  placeholder,
  icon,
  open,
  active,
  invalid,
  describedBy,
  separator,
  dense,
  ...rest
}: StayFieldProps) {
  return (
    <Button
      {...rest}
      variant="ghost"
      aria-expanded={open}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        'h-auto w-full justify-start gap-3 text-left',
        dense ? 'min-h-16 px-4' : 'min-h-18 px-5',
        (active ?? open) && 'bg-paper',
        invalid && 'ring-2 ring-destructive ring-inset',
        separator &&
          'after:absolute after:top-1/4 after:right-0 after:h-1/2 after:w-px after:bg-line',
      )}
    >
      <span className="text-brand-ink">{icon}</span>
      <span className="min-w-0">
        <span className="block text-caption font-semibold text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'block truncate',
            value ? 'font-semibold' : 'text-muted-foreground',
          )}
        >
          {value ?? placeholder}
        </span>
      </span>
    </Button>
  );
}

/**
 * Room-page stay picker: dates, guests and live quote, with URL state and
 * availability feedback kept in sync with the server.
 */
export function StayPicker({
  variant,
  value,
  onChange,
  onSubmit,
  isPending = false,
  problem = null,
  openSignal = 0,
}: StayPickerProps) {
  const [owner, setOwner] = useState<Owner>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(1);
  const [draft, setDraft] = useState<DateRange>({
    checkIn: value.checkIn,
    checkOut: value.checkOut,
  });
  const [draftAdults, setDraftAdults] = useState(value.adults);
  const [draftChildren, setDraftChildren] = useState(value.children);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ids = { bar: useId(), sheet: useId() };
  const hero = variant === 'hero';
  const { checkIn, checkOut, adults, children } = value;
  const notice = problem ?? submitError;

  const today = todayISO();
  const badStart = !checkIn || checkIn < today;
  const badEnd = !checkOut || (checkIn !== null && checkOut <= checkIn);

  const chip =
    checkIn && checkOut
      ? `${formatRange(checkIn, checkOut)}, ${guestSummary(value)}`
      : 'Add dates and guests';

  const barNoticeId = notice && !sheetOpen ? ids.bar : undefined;

  function commit(patch: Partial<SearchState>) {
    setSubmitError(null);
    onChange(patch);
  }

  function panelChange(which: Exclude<Owner, null>, next: boolean) {
    if (!next) {
      setOwner((current) => (current === which ? null : current));
      return;
    }
    const datesWereShown = owner === 'checkIn' || owner === 'checkOut';
    if (which === 'guests') {
      setDraftAdults(adults);
      setDraftChildren(children);
    } else if (!datesWereShown) {
      setDraft({ checkIn, checkOut });
    }
    setOwner(which);
  }

  function commitGuests(which: 'adults' | 'children', next: number) {
    if (which === 'adults') setDraftAdults(next);
    else setDraftChildren(next);
    commit(which === 'adults' ? { adults: next } : { children: next });
  }

  function closePanel() {
    setOwner(null);
  }

  function onDesktopDates(next: DateRange) {
    setDraft(next);
    if (next.checkIn && next.checkOut) {
      commit({ checkIn: next.checkIn, checkOut: next.checkOut });
      closePanel();
    }
  }

  function openSheet() {
    setDraft({ checkIn, checkOut });
    setDraftAdults(adults);
    setDraftChildren(children);
    setSubmitError(null);
    setSnap(1);
    setSheetOpen(true);
  }

  function applySheet(submit: boolean) {
    const patch: Partial<SearchState> = {
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      adults: draftAdults,
      children: draftChildren,
    };
    if (submit && onSubmit) {
      // The sheet stays open on a rejected search, so the reason has to be
      // kept: dropping it would leave the guest pressing a button that
      // appears to do nothing.
      const message = onSubmit({ ...value, ...patch });
      if (message) {
        setSubmitError(message);
        return;
      }
    }
    commit(patch);
    setSheetOpen(false);
  }

  function search(next: SearchState) {
    setSubmitError(onSubmit ? onSubmit(next) : null);
  }

  const [prevSignal, setPrevSignal] = useState(openSignal);
  if (prevSignal !== openSignal) {
    setPrevSignal(openSignal);
    if (openSignal !== 0) {
      if (window.matchMedia('(min-width: 768px)').matches) {
        setDraft({ checkIn, checkOut });
        setOwner('checkIn');
      } else {
        openSheet();
      }
    }
  }

  const datesShown = owner === 'checkIn' || owner === 'checkOut';

  const datesPanel = (
    <PopoverContent
      aria-label="Choose your dates"
      align="start"
      sideOffset={12}
      className={panelFrame}
    >
      <DatePicker value={draft} onChange={onDesktopDates} monthsShown={2} />
      <div className="flex justify-end border-t border-line pt-4">
        <Button
          variant="ghost"
          disabled={!draft.checkIn && !draft.checkOut}
          onClick={() => {
            setDraft({ checkIn: null, checkOut: null });
            commit({ checkIn: null, checkOut: null });
            closePanel();
          }}
        >
          Clear dates
        </Button>
      </div>
    </PopoverContent>
  );

  const datesField = (
    which: 'checkIn' | 'checkOut',
    label: string,
    shown: string | null,
    invalid: boolean,
  ) => (
    <Popover
      open={owner === which}
      onOpenChange={(next) => panelChange(which, next)}
    >
      <PopoverTrigger
        render={
          <StayField
            label={label}
            value={shown}
            placeholder="Add date"
            icon={<CalendarDays className="size-5" aria-hidden />}
            open={owner === which}
            active={datesShown}
            invalid={Boolean(notice) && invalid}
            describedBy={barNoticeId}
            separator
            dense={!hero}
          />
        }
      />
      {datesPanel}
    </Popover>
  );

  const desktopBar = (
    <div
      role="group"
      aria-label={hero ? 'Check availability' : 'Your stay'}
      className={cn(
        'grid rounded-card bg-card ring-1 ring-ink/10',
        hero
          ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] p-2 shadow-float'
          : 'grid-cols-3 p-1.5 shadow-raised',
      )}
    >
      {datesField(
        'checkIn',
        'Check-in',
        checkIn ? formatShort(checkIn) : null,
        badStart,
      )}
      {datesField(
        'checkOut',
        'Check-out',
        checkOut ? formatShort(checkOut) : null,
        badEnd,
      )}
      <Popover
        open={owner === 'guests'}
        onOpenChange={(next) => panelChange('guests', next)}
      >
        <PopoverTrigger
          render={
            <StayField
              label="Guests"
              value={guestSummary(value)}
              placeholder="Add guests"
              icon={<Users className="size-5" aria-hidden />}
              open={owner === 'guests'}
              invalid={Boolean(notice) && !badStart && !badEnd}
              describedBy={barNoticeId}
              dense={!hero}
            />
          }
        />
        <PopoverContent
          aria-label="Choose guests"
          align="end"
          sideOffset={12}
          className={cn(panelFrame, 'w-96 gap-3')}
        >
          <div className="divide-y divide-line">
            <GuestStepper
              label="Adults"
              unit={{ one: 'adult', many: 'adults' }}
              hint="Age 13 and over"
              value={draftAdults}
              min={1}
              max={MAX_ADULTS}
              onChange={(next) => commitGuests('adults', next)}
            />
            <GuestStepper
              label="Children"
              unit={{ one: 'child', many: 'children' }}
              hint="Age 0 to 12"
              value={draftChildren}
              min={0}
              max={MAX_CHILDREN}
              onChange={(next) => commitGuests('children', next)}
            />
          </div>
          <Button
            variant="dark"
            className="w-full"
            onClick={() => closePanel()}
          >
            Done
          </Button>
        </PopoverContent>
      </Popover>
      {hero && (
        <Button
          size="lg"
          loading={isPending}
          icon={<Search className="size-5" aria-hidden />}
          onClick={() => search(value)}
          className="ml-2 self-stretch px-8"
        >
          {isPending ? 'Searching' : 'Search'}
        </Button>
      )}
    </div>
  );

  const trigger = hero ? (
    <Button
      variant="secondary"
      aria-haspopup="dialog"
      aria-describedby={barNoticeId}
      onClick={openSheet}
      className="h-auto w-full justify-start gap-4 p-4 text-left shadow-float"
    >
      <IconBadge>
        <Search />
      </IconBadge>
      <span className="min-w-0">
        <span className="block font-semibold">Check availability</span>
        <span className="block truncate text-small text-muted-foreground">
          {chip}
        </span>
      </span>
    </Button>
  ) : (
    <Button
      variant="secondary"
      aria-haspopup="dialog"
      aria-describedby={barNoticeId}
      onClick={openSheet}
      className="h-auto min-h-12 w-full justify-between rounded-full px-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <CalendarDays className="size-5 shrink-0 text-brand-ink" aria-hidden />
        <span className="truncate font-semibold">{chip}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-small font-semibold">
        <Pencil className="size-4" aria-hidden />
        Edit
      </span>
    </Button>
  );

  const sheet = (
    <Drawer
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      snapPoints={sheetSnapPoints}
      snapPoint={snap}
      onSnapPointChange={setSnap}
      showSwipeHandle
    >
      <DrawerContent className="bg-paper text-ink">
        <DrawerHeader className="gap-1.5 border-b border-line pb-4">
          <DrawerTitle className="font-display text-h3 font-semibold text-ink">
            {hero ? 'Check availability' : 'Your stay'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Choose check-in and check-out dates and the number of guests.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <DatePicker
            value={draft}
            onChange={(next) => {
              setDraft(next);
              setSubmitError(null);
            }}
            monthsShown={1}
          />
          <div className="mt-6 divide-y divide-line border-t border-line">
            <GuestStepper
              label="Adults"
              unit={{ one: 'adult', many: 'adults' }}
              hint="Age 13 and over"
              value={draftAdults}
              min={1}
              max={MAX_ADULTS}
              onChange={setDraftAdults}
            />
            <GuestStepper
              label="Children"
              unit={{ one: 'child', many: 'children' }}
              hint="Age 0 to 12"
              value={draftChildren}
              min={0}
              max={MAX_CHILDREN}
              onChange={setDraftChildren}
            />
          </div>
        </div>
        <DrawerFooter className="gap-3 border-t border-line bg-card px-5 pt-4 pb-safe">
          {notice && (
            <p
              id={ids.sheet}
              role="alert"
              className="text-small font-medium text-destructive"
            >
              {notice}
            </p>
          )}
          <div className="flex w-full gap-3">
            <Button
              variant="ghost"
              disabled={!draft.checkIn && !draft.checkOut}
              onClick={() => {
                setDraft({ checkIn: null, checkOut: null });
                setSubmitError(null);
              }}
            >
              Clear dates
            </Button>
            <Button
              loading={isPending}
              className="flex-1"
              onClick={() => applySheet(hero)}
            >
              {hero ? (isPending ? 'Searching' : 'Search') : 'Update'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  const message = barNoticeId && (
    <p
      id={ids.bar}
      role={hero ? 'alert' : 'status'}
      className="pt-2 text-small font-medium text-destructive"
    >
      {notice}
    </p>
  );

  if (hero) {
    return (
      <div id={AVAILABILITY_SEARCH_ID}>
        <div className="hidden md:block">{desktopBar}</div>
        <div className="md:hidden">{trigger}</div>
        {message}
        {sheet}
      </div>
    );
  }

  return (
    <div className="sticky top-(--header-h) z-(--z-sticky) border-b border-line bg-paper/95 py-3 backdrop-blur lg:top-(--header-h-lg)">
      <div className="container-page">
        <div className="hidden md:block">{desktopBar}</div>
        <div className="md:hidden">{trigger}</div>
        {message}
      </div>
      {sheet}
    </div>
  );
}
