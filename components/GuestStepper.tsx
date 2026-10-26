'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

interface GuestStepperProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const stepButton =
  'grid size-11 place-items-center rounded-full border border-ink/60 text-ink transition-colors hover:bg-ink hover:text-paper active:bg-ink-soft active:text-paper ' +
  'disabled:border-line disabled:text-ink/30 disabled:hover:bg-transparent disabled:hover:text-ink/30';

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
        <p className="text-small text-muted">{hint}</p>
      </div>
      <div
        role="group"
        aria-labelledby={id}
        className="flex items-center gap-3"
      >
        <button
          type="button"
          aria-label={`Fewer ${noun}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className={stepButton}
        >
          <Minus className="size-5" aria-hidden />
        </button>
        <output
          aria-live="polite"
          className="text-body-lg w-6 text-center font-semibold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={`More ${noun}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className={stepButton}
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
