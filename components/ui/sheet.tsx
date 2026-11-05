'use client';

import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The panel is positioned by `side` in JavaScript rather than through
 * `data-[side=*]` variants so a consumer width utility (the mobile sidebar
 * passes `w-(--sidebar-width)`) merges against a plain `w-full` instead of
 * losing to a higher-specificity variant class.
 */
const sheetSideClass = {
  top: 'inset-x-0 top-0 h-auto border-b data-ending-style:-translate-y-10 data-starting-style:-translate-y-10',
  bottom:
    'inset-x-0 bottom-0 h-auto border-t data-ending-style:translate-y-10 data-starting-style:translate-y-10',
  left: 'inset-y-0 left-0 h-full w-full border-r data-ending-style:-translate-x-10 data-starting-style:-translate-x-10',
  right:
    'inset-y-0 right-0 h-full w-full border-l data-ending-style:translate-x-10 data-starting-style:translate-x-10',
} as const;

/** Only the edge-anchored sides have a width; top/bottom span the viewport. */
const sheetSizeClass = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
} as const;

/**
 * Same two materials as `DialogContent`: `popover` is the staff-facing card
 * white, `paper` the guest-facing warm surface.
 */
const sheetSurfaceClass = {
  popover: 'bg-popover text-popover-foreground',
  paper: 'bg-paper text-ink',
} as const;

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  size = 'sm',
  surface = 'popover',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  size?: keyof typeof sheetSizeClass;
  surface?: keyof typeof sheetSurfaceClass;
  showCloseButton?: boolean;
}) {
  const anchoredToEdge = side === 'left' || side === 'right';

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col border-line text-small shadow-float transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
          sheetSurfaceClass[surface],
          anchoredToEdge && sheetSizeClass[size],
          sheetSideClass[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        'flex shrink-0 flex-col gap-1.5 border-b border-line px-5 py-3 pr-14',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The scroll region between header and footer. Padding belongs here, never on
 * `SheetContent`, so a full-bleed footer stays aligned with the panel edge.
 */
function SheetBody({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'min-h-0 flex-1 overflow-y-auto p-5 empty:hidden',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sheet-body',
    },
  });
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'mt-auto flex shrink-0 flex-col gap-2 px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-display text-h3 font-semibold text-ink', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-small text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
