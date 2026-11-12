'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ReorderButtonsProps {
  /** What the buttons move, spoken in each accessible name. */
  label: string;
  index: number;
  count: number;
  /** Disables both arrows while a reorder call is in flight. */
  busy?: boolean;
  /** A grid reads as earlier/later; a list column reads as up/down. */
  words?: [up: string, down: string];
  onMove: (direction: 'up' | 'down') => void;
}

/**
 * The pair of arrows every ordered admin list needs. The touch target is the
 * full 44px icon button because a reorder is a deliberate act, and both arrows
 * share one disabled rule so a row cannot be pushed while another is moving.
 */
export function ReorderButtons({
  label,
  index,
  count,
  busy = false,
  words = ['up', 'down'],
  onMove,
}: ReorderButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onMove('up')}
        disabled={index === 0 || busy}
        aria-label={`Move ${label} ${words[0]}`}
      >
        <ArrowUp className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onMove('down')}
        disabled={index === count - 1 || busy}
        aria-label={`Move ${label} ${words[1]}`}
      >
        <ArrowDown className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
