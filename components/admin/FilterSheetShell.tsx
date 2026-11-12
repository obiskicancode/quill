'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface FilterSheetShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tailwind visibility class matching the breakpoint the inline bar hides at. */
  hiddenBelow: 'sm:hidden' | 'lg:hidden';
  title: string;
  description: ReactNode;
  /** Singular noun the result count speaks about, e.g. `reservation`. */
  resultNoun: string;
  /** Omitted while the count is still arriving. */
  resultCount?: number;
  onClearAll: () => void;
  children: ReactNode;
}

/**
 * Bottom-sheet frame shared by the admin filter bars. Its controls commit to
 * the URL as they are touched, so the footer dismisses rather than pretends to
 * apply, and the header states what the current view actually returned.
 */
export function FilterSheetShell({
  open,
  onOpenChange,
  hiddenBelow,
  title,
  description,
  resultNoun,
  resultCount,
  onClearAll,
  children,
}: FilterSheetShellProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn('max-h-[85vh] rounded-t-card', hiddenBelow)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
          <p
            role="status"
            className="text-caption font-semibold text-muted-foreground"
          >
            {resultCount === undefined
              ? 'Counting matching results…'
              : `${resultCount} matching ${resultNoun}${
                  resultCount === 1 ? '' : 's'
                }.`}
          </p>
        </SheetHeader>

        <SheetBody className="space-y-4">{children}</SheetBody>

        <SheetFooter className="flex-row items-center border-t border-line">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onClearAll}
          >
            Clear all
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Show results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
