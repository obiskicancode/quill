import Link from 'next/link';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

import { Spinner } from '@/components/ui/spinner';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform,opacity] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-safe:active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-brand-hover',
        primary: 'bg-primary text-primary-foreground hover:bg-brand-hover',
        dark: 'bg-ink text-paper hover:bg-ink-soft active:bg-ink',
        secondary:
          'border-line bg-paper text-ink hover:bg-muted active:bg-muted/80',
        secondaryOnDark:
          'border-white text-white hover:bg-white hover:text-ink active:bg-paper active:text-ink',
        whatsapp:
          'bg-whatsapp text-white hover:bg-whatsapp-hover active:bg-whatsapp',
        ghost:
          'text-current hover:bg-accent hover:text-accent-foreground active:bg-accent',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        danger:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 gap-1.5 px-3 text-xs',
        xs: "h-6 gap-1 rounded-control px-2 text-xs in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-control px-2.5 text-xs in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        md: 'min-h-11 px-4 text-sm gap-2',
        lg: 'min-h-13 px-6 text-base gap-2.5',
        icon: 'size-8 p-0',
        'icon-xs':
          "size-6 rounded-control p-0 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-control p-0 in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>['variant']
>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'default',
  className = '',
): string {
  return cn(buttonVariants({ variant, size }), className);
}

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type ButtonProps = SharedProps & { loading?: boolean } & Omit<
    ButtonPrimitive.Props,
    'className' | 'children'
  > &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children' | 'type'
  >;

function Button({
  variant = 'primary',
  size = 'default',
  icon,
  className,
  children,
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const isNativeButton = props.nativeButton !== false && !props.render;

  return (
    <ButtonPrimitive
      data-slot="button"
      {...(isNativeButton ? { type } : {})}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </ButtonPrimitive>
  );
}

type ButtonLinkProps = SharedProps & {
  href: string;
  external?: boolean;
} & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'className' | 'children' | 'href'
  >;

function ButtonLink({
  variant = 'primary',
  size = 'default',
  icon,
  className,
  children,
  href,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);
  const content = (
    <>
      {icon}
      {children}
    </>
  );
  if (href.startsWith('/') && !external) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {content}
    </a>
  );
}

export { Button, ButtonLink, buttonVariants };
export type { ButtonSize, ButtonVariant };
