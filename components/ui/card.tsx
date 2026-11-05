import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({
  className,
  size = 'default',
  variant = 'raised',
  render,
  ...props
}: useRender.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  variant?: 'raised' | 'flat';
}) {
  // `data-*` markers are not in React's DOM prop types, so they go through a
  // variable rather than an object literal at the call site. The variants on
  // this element (`data-[size=sm]`, `has-data-[slot=card-footer]`) read them.
  const markers = { 'data-slot': 'card', 'data-size': size };
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        ...markers,
        className: cn(
          'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-card border border-line bg-card py-(--card-spacing) text-small text-card-foreground [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-card *:[img:last-child]:rounded-b-card',
          // `shadow-*` is not a tailwind-merge group, so the two elevations have
          // to be mutually exclusive here rather than stacked for the consumer.
          variant === 'flat' ? 'shadow-none' : 'shadow-raised',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'card',
      size,
      variant,
    },
  });
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-card px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a `div` by default, but a card title is usually the section heading,
 * so pass `render={<h2 />}` (or `h3`) to keep the document outline intact.
 */
function CardTitle({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  const markers = { 'data-slot': 'card-title' };
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        ...markers,
        className: cn(
          'text-body leading-snug font-medium group-data-[size=sm]/card:text-small',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'card-title',
    },
  });
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-small text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-card border-t bg-muted/50 p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
