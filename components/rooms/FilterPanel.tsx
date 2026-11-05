'use client';

import { useId, useState } from 'react';

import { formatNaira, formatNairaDigits, pluralCount } from '@/lib/format';
import {
  bedTypeLabels,
  countActiveFilters,
  emptyFilters,
  filterAmenityOptions,
  priceBands,
  type PriceBand,
} from '@/lib/rooms';
import { cn } from '@/lib/utils';
import type { BedType, FilterAmenity, RoomFilters } from '@/types/rooms.types';

import { GuestStepper } from '../GuestStepper';
import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../ui/input-group';
import { Label } from '../ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

interface PanelProps {
  value: RoomFilters;
  onChange: (next: RoomFilters) => void;
  priceBounds: { min: number; max: number } | null;
  maxGuestsAvailable: number;
  /** How many rooms a candidate filter set would show. */
  countFor: (draft: RoomFilters) => number;
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
  const [text, setText] = useState(
    value === null ? '' : formatNairaDigits(value),
  );
  const commit = () => {
    const digits = text.replace(/\D/g, '');
    onCommit(digits === '' ? null : Number(digits));
  };
  return (
    <div className="flex-1">
      <Label
        htmlFor={id}
        className="text-caption font-semibold text-muted-foreground"
      >
        {label}
      </Label>
      <InputGroup className="mt-1 h-11">
        <InputGroupAddon>
          <InputGroupText>₦</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
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
          className="h-full tabular-nums"
        />
      </InputGroup>
    </div>
  );
}

function CheckGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
  countFor,
}: {
  legend: string;
  options: { key: T; label: string }[];
  selected: T[];
  onToggle: (key: T) => void;
  /** Rooms matching this option on its own, with every other filter kept. */
  countFor: (key: T) => number;
}) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      <div className="mt-1 space-y-1">
        {options.map((option) => {
          const count = countFor(option.key);
          const isSelected = selected.includes(option.key);
          return (
            <Label
              key={option.key}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 text-small font-normal',
                count === 0 && 'text-muted-foreground',
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(option.key)}
                aria-label={`${option.label}, ${pluralCount(count, 'room')}`}
              />
              <span className="flex-1">{option.label}</span>
              <span className="text-caption tabular-nums">{count}</span>
            </Label>
          );
        })}
      </div>
    </fieldset>
  );
}

const toggle = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

const bandLabel = (band: PriceBand): string =>
  band.minPrice === null
    ? `Up to ${formatNaira(band.maxPrice!)}`
    : band.maxPrice === null
      ? `${formatNaira(band.minPrice)}+`
      : `${formatNaira(band.minPrice)} – ${formatNaira(band.maxPrice)}`;

/** Filter controls. Desktop: a left column that applies instantly. Mobile: shown inside FilterSheet. */
export function FilterPanel({
  value,
  onChange,
  priceBounds,
  maxGuestsAvailable,
  countFor,
}: PanelProps) {
  const setPrice = (min: number | null, max: number | null) => {
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    onChange({ ...value, minPrice: min, maxPrice: max });
  };
  const bedOptions = (Object.keys(bedTypeLabels) as BedType[]).map((key) => ({
    key,
    label: bedTypeLabels[key],
  }));
  const bands = priceBands(priceBounds);

  return (
    <StaggerGroup className="space-y-6" staggerChildren={0.06}>
      <StaggerItem>
        <fieldset>
          <legend className="font-semibold">Price per night</legend>
          {bands.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {bands.map((band) => {
                const isActive =
                  band.minPrice === value.minPrice &&
                  band.maxPrice === value.maxPrice;
                return (
                  <Button
                    key={`${band.minPrice}-${band.maxPrice}`}
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={isActive}
                    className="min-h-11 rounded-full px-3.5"
                    onClick={() => setPrice(band.minPrice, band.maxPrice)}
                  >
                    {bandLabel(band)}
                  </Button>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex gap-3">
            <PriceField
              key={`min-${value.minPrice}`}
              label="From"
              value={value.minPrice}
              placeholder={
                priceBounds ? formatNairaDigits(priceBounds.min) : '0'
              }
              onCommit={(n) => setPrice(n, value.maxPrice)}
            />
            <PriceField
              key={`max-${value.maxPrice}`}
              label="To"
              value={value.maxPrice}
              placeholder={
                priceBounds ? formatNairaDigits(priceBounds.max) : 'Any'
              }
              onCommit={(n) => setPrice(value.minPrice, n)}
            />
          </div>
          {priceBounds && (
            <p className="mt-2 text-caption text-muted-foreground">
              Rooms run from {formatNaira(priceBounds.min)} to{' '}
              {formatNaira(priceBounds.max)}. Rooms with no published price
              always show.
            </p>
          )}
        </fieldset>
      </StaggerItem>

      <StaggerItem>
        <div className="border-t border-line">
          <GuestStepper
            label="Minimum guests"
            unit={{ one: 'guest', many: 'guests' }}
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
        <div className="border-t border-line pt-4">
          <CheckGroup
            legend="Bed type"
            options={bedOptions}
            selected={value.beds}
            onToggle={(k) =>
              onChange({ ...value, beds: toggle(value.beds, k) })
            }
            countFor={(k) => countFor({ ...value, beds: [k] })}
          />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="border-t border-line pt-4">
          <CheckGroup<FilterAmenity>
            legend="Amenities"
            options={filterAmenityOptions}
            selected={value.amenities}
            onToggle={(k) =>
              onChange({ ...value, amenities: toggle(value.amenities, k) })
            }
            countFor={(k) => countFor({ ...value, amenities: [k] })}
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
        surface="paper"
        className="max-h-[90dvh] rounded-t-card"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Filter available rooms by price, guests, room type, bed type, and
            amenities.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <FilterPanel
            value={draft}
            onChange={setDraft}
            priceBounds={priceBounds}
            maxGuestsAvailable={maxGuestsAvailable}
            countFor={countFor}
          />
        </SheetBody>
        <SheetFooter className="flex-row items-center gap-3 border-t border-line bg-card pb-safe">
          <Button
            variant="ghost"
            disabled={countActiveFilters(draft) === 0}
            onClick={() => setDraft(emptyFilters)}
          >
            Clear all filters
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Show {pluralCount(count, 'room')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
