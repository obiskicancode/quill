import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const FOCUS_RING =
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring';

/**
 * The shared keyboard contract for a clickable table row or mobile card: a tab
 * stop, button semantics, Enter/Space activation and a visible focus ring.
 */
export function clickableRowProps(
  label: string,
  onSelect: () => void,
  className?: string,
): HTMLAttributes<HTMLElement> {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick: onSelect,
    onKeyDown: (event) => {
      // Rows hold their own links and checkboxes; a keypress that did not
      // start on the row itself belongs to whichever control has focus.
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    },
    className: cn('cursor-pointer', FOCUS_RING, className),
  };
}
