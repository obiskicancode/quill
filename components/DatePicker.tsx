'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import {
  addDays,
  addMonths,
  daysInMonth,
  formatLong,
  formatMonthYear,
  formatShort,
  nightsBetween,
  shiftMonth,
  startOfMonth,
  sundayIndex,
  todayISO,
} from '@/lib/dates';
import type { DateRange, ISODate } from '@/types/dates.types';

import { Button } from './ui/button';

interface DatePickerProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  monthsShown: 1 | 2;
  maxMonthsAhead?: number;
}

const WEEKDAYS = [
  ['Mo', 'Monday'],
  ['Tu', 'Tuesday'],
  ['We', 'Wednesday'],
  ['Th', 'Thursday'],
  ['Fr', 'Friday'],
  ['Sa', 'Saturday'],
  ['Su', 'Sunday'],
] as const;

const navButton =
  'absolute top-0 z-10 grid size-11 place-items-center rounded-full transition-colors hover:bg-ink/10 active:bg-ink/15 disabled:opacity-30 disabled:hover:bg-transparent';

/** Range calendar: tap check-in, then check-out. Arrow keys, Home/End and PageUp/PageDown move focus. Past dates are disabled. */
export function DatePicker({
  value,
  onChange,
  monthsShown,
  maxMonthsAhead = 18,
}: DatePickerProps) {
  const today = todayISO();
  const minMonth = startOfMonth(today);
  const maxMonth = addMonths(minMonth, maxMonthsAhead);
  const lastDay = addDays(addMonths(maxMonth, 1), -1);

  const [view, setView] = useState<ISODate>(
    startOfMonth(value.checkIn ?? today),
  );
  const [focusIso, setFocusIso] = useState<ISODate>(value.checkIn ?? today);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const baseId = useId();

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    rootRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-date="${focusIso}"]`)
      ?.focus();
  }, [focusIso, view]);

  const { checkIn, checkOut } = value;
  const months = Array.from({ length: monthsShown }, (_, i) =>
    addMonths(view, i),
  );
  const lastShownMonth = months[months.length - 1];

  function pick(iso: ISODate) {
    if (!checkIn || checkOut) onChange({ checkIn: iso, checkOut: null });
    else if (iso > checkIn) onChange({ checkIn, checkOut: iso });
    else onChange({ checkIn: iso, checkOut: null });
    setFocusIso(iso);
  }

  function showMonth(nextView: ISODate) {
    if (nextView < minMonth || nextView > maxMonth) return;
    setView(nextView);
    setFocusIso(nextView > today ? nextView : today);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: ISODate;
    if (e.key in steps) next = addDays(focusIso, steps[e.key]);
    else if (e.key === 'Home') next = addDays(focusIso, -sundayIndex(focusIso));
    else if (e.key === 'End')
      next = addDays(focusIso, 6 - sundayIndex(focusIso));
    else if (e.key === 'PageUp') next = shiftMonth(focusIso, -1);
    else if (e.key === 'PageDown') next = shiftMonth(focusIso, 1);
    else return;
    e.preventDefault();
    if (next < today) next = today;
    if (next > lastDay) next = lastDay;
    pendingFocus.current = true;
    setFocusIso(next);
    const month = startOfMonth(next);
    if (month < view) setView(month);
    else if (month > lastShownMonth)
      setView(addMonths(month, -(monthsShown - 1)));
  }

  const guidance = !checkIn
    ? 'Choose your check-in date.'
    : !checkOut
      ? `Check-in ${formatShort(checkIn)}. Now choose your check-out date.`
      : `${formatShort(checkIn)} to ${formatShort(checkOut)}, ${nightsBetween(checkIn, checkOut)} ${nightsBetween(checkIn, checkOut) === 1 ? 'night' : 'nights'}.`;

  return (
    <div ref={rootRef} onKeyDown={onKeyDown}>
      <p aria-live="polite" className="text-small mb-3 font-medium">
        {guidance}
      </p>

      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={view <= minMonth}
          onClick={() => showMonth(addMonths(view, -1))}
          className={`${navButton} left-0`}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next month"
          disabled={lastShownMonth >= maxMonth}
          onClick={() => showMonth(addMonths(view, 1))}
          className={`${navButton} right-0`}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>

        <div className={monthsShown === 2 ? 'grid grid-cols-2 gap-8' : ''}>
          {months.map((month) => {
            const headingId = `${baseId}-${month}`;
            const blanks = sundayIndex(month);
            const cells: (ISODate | null)[] = [
              ...Array<null>(blanks).fill(null),
              ...Array.from({ length: daysInMonth(month) }, (_, i) =>
                addDays(month, i),
              ),
            ];
            while (cells.length % 7 !== 0) cells.push(null);
            const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
              cells.slice(w * 7, w * 7 + 7),
            );

            return (
              <div key={month}>
                <h3
                  id={headingId}
                  className="flex h-11 items-center justify-center font-semibold"
                >
                  {formatMonthYear(month)}
                </h3>
                <table
                  role="grid"
                  aria-labelledby={headingId}
                  className="w-full border-separate border-spacing-x-0 border-spacing-y-1"
                >
                  <thead>
                    <tr>
                      {WEEKDAYS.map(([short, long]) => (
                        <th
                          key={short}
                          scope="col"
                          abbr={long}
                          className="text-caption text-muted-foreground h-8 text-center font-semibold"
                        >
                          {short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, w) => (
                      <tr key={w}>
                        {week.map((iso, d) => {
                          if (!iso) return <td key={d} role="gridcell" />;
                          const isStart = iso === checkIn;
                          const isEnd = iso === checkOut;
                          const inRange = Boolean(
                            checkIn &&
                            checkOut &&
                            iso > checkIn &&
                            iso < checkOut,
                          );
                          const disabled = iso < today || iso > lastDay;
                          const band = inRange
                            ? 'bg-primary/25'
                            : isStart && checkOut
                              ? 'bg-gradient-to-r from-transparent from-50% to-brand/25 to-50%'
                              : isEnd
                                ? 'bg-gradient-to-l from-transparent from-50% to-brand/25 to-50%'
                                : '';
                          const state =
                            isStart || isEnd
                              ? 'bg-ink text-paper'
                              : disabled
                                ? 'text-ink/30'
                                : `${iso === today ? 'ring-1 ring-inset ring-ink/50 ' : ''}hover:bg-ink/10 active:bg-ink/20`;
                          return (
                            <td
                              key={d}
                              role="gridcell"
                              className={`p-0 text-center ${band}`}
                            >
                              <Button
                                type="button"
                                variant={isStart || isEnd ? 'default' : 'ghost'}
                                size="icon"
                                data-date={iso}
                                disabled={disabled}
                                tabIndex={iso === focusIso ? 0 : -1}
                                aria-pressed={isStart || isEnd}
                                aria-label={`${formatLong(iso)}${isStart ? ', check-in' : ''}${isEnd ? ', check-out' : ''}`}
                                onClick={() => pick(iso)}
                                className={`text-small mx-auto size-11 rounded-full font-medium tabular-nums transition-colors ${state}`}
                              >
                                {Number(iso.slice(8))}
                              </Button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
