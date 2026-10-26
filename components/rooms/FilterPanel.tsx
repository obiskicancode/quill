'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { formatNaira } from '@/lib/format';
import {
  bedTypeLabels,
  countActiveFilters,
  emptyFilters,
  filterAmenityOptions,
  type BedType,
  type FilterAmenity,
  type RoomFilters,
} from '@/lib/rooms';

import { GuestStepper } from '../GuestStepper';
import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { Button } from '../ui/Button';

interface PanelProps {
  value: RoomFilters;
  onChange: (next: RoomFilters) => void;
  priceBounds: { min: number; max: number } | null;
  maxGuestsAvailable: number;
}

function PriceField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  onCommit: (n: number | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : String(value));
  const commit = () => {
    const digits = text.replace(/\D/g, '');
    onCommit(digits === '' ? null : Number(digits));
  };
  return (
    <div className="flex-1">
      <label htmlFor={id} className="text-caption text-muted font-semibold">
        {label}
      </label>
      <div className="rounded-control border-ink/60 bg-surface focus-within:ring-ink mt-1 flex min-h-11 items-center gap-1 border px-3 focus-within:ring-2">
        <span aria-hidden className="text-muted">
          ₦
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          className="w-full min-w-0 bg-transparent py-2 tabular-nums focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

function CheckGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { key: T; label: string }[];
  selected: T[];
  onToggle: (key: T) => void;
}) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      <div className="mt-1">
        {options.map((o) => (
          <label
            key={o.key}
            className="text-small flex min-h-11 cursor-pointer items-center gap-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.key)}
              onChange={() => onToggle(o.key)}
              className="accent-ink size-5 shrink-0"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const toggle = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/** Filter controls. Desktop: a left column that applies instantly. Mobile: shown inside FilterSheet. */
export function FilterPanel({
  value,
  onChange,
  priceBounds,
  maxGuestsAvailable,
}: PanelProps) {
  const setPrice = (min: number | null, max: number | null) => {
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    onChange({ ...value, minPrice: min, maxPrice: max });
  };
  const bedOptions = (Object.keys(bedTypeLabels) as BedType[]).map((key) => ({
    key,
    label: bedTypeLabels[key],
  }));

  return (
    <StaggerGroup className="space-y-6" staggerChildren={0.06}>
      <StaggerItem>
        <fieldset>
          <legend className="font-semibold">Price per night</legend>
          <div className="mt-2 flex gap-3">
            <PriceField
              key={`min-${value.minPrice}`}
              label="From"
              value={value.minPrice}
              placeholder={
                priceBounds ? priceBounds.min.toLocaleString('en-NG') : '0'
              }
              onCommit={(n) => setPrice(n, value.maxPrice)}
            />
            <PriceField
              key={`max-${value.maxPrice}`}
              label="To"
              value={value.maxPrice}
              placeholder={
                priceBounds ? priceBounds.max.toLocaleString('en-NG') : 'Any'
              }
              onCommit={(n) => setPrice(value.minPrice, n)}
            />
          </div>
          {priceBounds && (
            <p className="text-caption text-muted mt-2">
              Rooms run from {formatNaira(priceBounds.min)} to{' '}
              {formatNaira(priceBounds.max)}. Rooms with no published price
              always show.
            </p>
          )}
        </fieldset>
      </StaggerItem>

      <StaggerItem>
        <div className="border-line border-t">
          <GuestStepper
            label="Minimum guests"
            hint="Rooms that sleep at least this many"
            value={value.minGuests ?? 1}
            min={1}
            max={maxGuestsAvailable}
            onChange={(n) =>
              onChange({ ...value, minGuests: n <= 1 ? null : n })
            }
          />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="border-line border-t pt-4">
          <CheckGroup
            legend="Bed type"
            options={bedOptions}
            selected={value.beds}
            onToggle={(k) =>
              onChange({ ...value, beds: toggle(value.beds, k) })
            }
          />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="border-line border-t pt-4">
          <CheckGroup<FilterAmenity>
            legend="Amenities"
            options={filterAmenityOptions}
            selected={value.amenities}
            onToggle={(k) =>
              onChange({ ...value, amenities: toggle(value.amenities, k) })
            }
          />
        </div>
      </StaggerItem>
    </StaggerGroup>
  );
}

interface SheetProps extends Omit<PanelProps, 'onChange'> {
  open: boolean;
  onClose: () => void;
  onApply: (next: RoomFilters) => void;
  /** How many rooms the draft filters would show. */
  countFor: (draft: RoomFilters) => number;
}

/** Mobile bottom sheet (native dialog: focus is trapped, Esc closes). Changes apply when "Show rooms" is tapped. */
export function FilterSheet({
  open,
  onClose,
  value,
  onApply,
  countFor,
  priceBounds,
  maxGuestsAvailable,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the draft each time the sheet opens
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const count = countFor(draft);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="text-ink backdrop:bg-ink/60 inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none bg-transparent p-0 open:flex open:flex-col"
    >
      {open && (
        <div className="animate-sheet-rise rounded-t-card bg-paper flex max-h-[90dvh] min-h-0 w-full flex-col overflow-hidden">
          <div className="border-line flex items-center justify-between border-b px-5 py-2">
            <h2 id={titleId} className="font-display text-h3">
              Filters
            </h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="hover:bg-ink/10 grid size-11 place-items-center rounded-full"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterPanel
              value={draft}
              onChange={setDraft}
              priceBounds={priceBounds}
              maxGuestsAvailable={maxGuestsAvailable}
            />
          </div>
          <div className="border-line bg-surface flex items-center gap-3 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              size="md"
              disabled={countActiveFilters(draft) === 0}
              onClick={() => setDraft(emptyFilters)}
            >
              Clear all
            </Button>
            <Button
              size="md"
              className="flex-1"
              disabled={count === 0}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              {count === 0
                ? 'No rooms match'
                : `Show ${count} ${count === 1 ? 'room' : 'rooms'}`}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
