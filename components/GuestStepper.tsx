'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { Button } from './ui/button';

interface GuestStepperProps {
  id?: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: { one: string; many: string };
}

/** Accessible quantity stepper with min/max and disabled states. */
export function GuestStepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  unit,
}: GuestStepperProps) {
  const labelId = useId();
  const many = (unit?.many ?? label).toLowerCase();
  const one = (unit?.one ?? many).toLowerCase();
  const atMax = value >= max;
  const atMin = value <= min;

  return (
    <div id={id} className="flex items-center justify-between gap-4 py-4">
      <div>
        <p id={labelId} className="font-semibold">
          {label}
        </p>
        <p className="text-small text-muted-foreground">{hint}</p>
        {atMax && (
          <p role="status" className="mt-1 text-caption text-brand-ink">
            Up to {max} {many}.
          </p>
        )}
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex items-center gap-3"
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Fewer ${many}`}
          disabled={atMin}
          onClick={() => onChange(value - 1)}
          className="rounded-full border-line hover:bg-primary hover:text-primary-foreground disabled:opacity-30"
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <output aria-live="polite" className="text-body-lg font-semibold">
          <span className="w-6 text-center tabular-nums">{value}</span>
          <span className="sr-only"> {value === 1 ? one : many}</span>
        </output>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`More ${many}`}
          disabled={atMax}
          onClick={() => onChange(value + 1)}
          className="rounded-full border-line hover:bg-primary hover:text-primary-foreground disabled:opacity-30"
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
