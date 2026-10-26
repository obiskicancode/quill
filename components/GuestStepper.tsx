'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { Button } from './ui/button';

interface GuestStepperProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function GuestStepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: GuestStepperProps) {
  const id = useId();
  const noun = label.toLowerCase();
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p id={id} className="font-semibold">
          {label}
        </p>
        <p className="text-small text-muted-foreground">{hint}</p>
      </div>
      <div
        role="group"
        aria-labelledby={id}
        className="flex items-center gap-3"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Fewer ${noun}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="border-line hover:bg-primary hover:text-primary-foreground size-11 rounded-full disabled:opacity-30"
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <output
          aria-live="polite"
          className="text-body-lg w-6 text-center font-semibold tabular-nums"
        >
          {value}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`More ${noun}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="border-line hover:bg-primary hover:text-primary-foreground size-11 rounded-full disabled:opacity-30"
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
