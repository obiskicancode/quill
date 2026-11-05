import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 border text-left has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current has-[>svg]:*:[svg]:shrink-0 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      /**
       * Each tone carries its own border colour: `cva` concatenates these
       * strings without merging, so the base rule must stay colour-free.
       */
      variant: {
        default: 'border-line bg-card text-card-foreground',
        destructive:
          'border-destructive/30 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        success:
          'border-success/30 bg-success/10 text-success *:data-[slot=alert-description]:text-success/90 *:[svg]:text-current',
        warning:
          'border-warning/30 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90 *:[svg]:text-current',
        brand:
          'border-primary/40 bg-primary/10 text-brand-ink *:data-[slot=alert-description]:text-brand-ink/90 *:[svg]:text-current',
        /**
         * Every other variant re-declares its description colour, and neutral
         * needs the same: the base rule paints descriptions `muted-foreground`
         * grey, which is too soft for the guest-facing notes (refund amounts,
         * hold terms) this variant carries on paper.
         */
        neutral:
          'border-line bg-paper text-ink *:data-[slot=alert-description]:text-ink/85',
      },
      /**
       * Radius and padding live on this axis rather than in the base rule.
       * Tailwind emits `.rounded-card` before `.rounded-control`, so a
       * consumer's `rounded-card` would silently lose to a base radius, and
       * `.p-4` emits before `.px-2.5`. The three stops have to be mutually
       * exclusive in JavaScript to be overridable at all.
       */
      size: {
        sm: 'rounded-control px-3 py-2 text-caption',
        default: 'rounded-control px-3 py-3 text-small',
        /**
         * A notice nested inside a card or dialog. Concentric radii say the
         * inner surface has to be tighter than the one framing it, so this
         * stop takes the control radius and only the padding grows; `banner`
         * keeps the card radius because it sits on the page, not in a card.
         */
        panel: 'rounded-control px-4 py-4 text-small',
        /** The full-bleed booking-flow notice: card radius, roomy pad. */
        banner: 'rounded-card px-5 py-5 text-body',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  size,
  role = 'alert',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-small text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute top-2 right-2', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
