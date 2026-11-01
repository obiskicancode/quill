'use client';

import { useId, useState } from 'react';

import { formatNaira } from '@/lib/format';
import {
  bedTypeLabels,
  countActiveFilters,
  emptyFilters,
  filterAmenityOptions,
} from '@/lib/rooms';
import type { BedType, FilterAmenity, RoomFilters } from '@/types/rooms.types';

import { GuestStepper } from '../GuestStepper';
import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

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
      <Label
        htmlFor={id}
        className="text-caption text-muted-foreground font-semibold"
      >
        {label}
      </Label>
      <div className="relative mt-1">
        <span
          aria-hidden
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
        >
          ₦
        </span>
        <Input
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
          className="min-h-11 pl-7 tabular-nums"
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
      <div className="mt-1 space-y-1">
        {options.map((o) => (
          <Label
            key={o.key}
            className="text-small flex min-h-11 cursor-pointer items-center gap-3 font-normal"
          >
            <Checkbox
              checked={selected.includes(o.key)}
              onCheckedChange={() => onToggle(o.key)}
            />
            {o.label}
          </Label>
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
            <p className="text-caption text-muted-foreground mt-2">
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

/** Mobile bottom sheet. Changes apply when "Show rooms" is tapped. */
export function FilterSheet({
  open,
  onClose,
  value,
  onApply,
  countFor,
  priceBounds,
  maxGuestsAvailable,
}: SheetProps) {
  const [draft, setDraft] = useState(value);

  // Reset the draft each time the sheet opens, and follow external value
  // changes while it is open.
  const [synced, setSynced] = useState({ open, value });
  if (synced.open !== open || synced.value !== value) {
    setSynced({ open, value });
    if (open) setDraft(value);
  }

  const count = countFor(draft);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton
        className="rounded-t-card border-line bg-paper text-ink max-h-[90dvh] gap-0 border-t p-0"
      >
        <SheetHeader className="border-line border-b px-5 py-2 pr-14">
          <SheetTitle className="font-display text-h3">Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Filter available rooms by price, guests, room type, bed type, and
            amenities.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FilterPanel
            value={draft}
            onChange={setDraft}
            priceBounds={priceBounds}
            maxGuestsAvailable={maxGuestsAvailable}
          />
        </div>
        <div className="border-line bg-card flex items-center gap-3 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
      </SheetContent>
    </Sheet>
  );
}
