import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-small font-semibold transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  {
    variants: {
      state: {
        idle: 'border-ink/50 bg-card text-ink hover:bg-ink hover:text-paper',
        active: 'border-ink bg-ink text-paper',
      },
    },
    defaultVariants: { state: 'idle' },
  },
);

export interface ChipProps
  extends useRender.ComponentProps<'a'>, VariantProps<typeof chipVariants> {}

/** A pill link used by jump navs and tag rails: same shape whether the item is the current one or not. */
export function Chip({ className, state, render, ...props }: ChipProps) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn(chipVariants({ state }), className),
      },
      props,
    ),
    render,
    state: { slot: 'chip', state },
  });
}
