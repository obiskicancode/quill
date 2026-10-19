import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'secondaryOnDark'
  | 'whatsapp'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-[color,background-color,border-color,transform] duration-150 motion-safe:active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-hover active:bg-accent-pressed',
  dark: 'bg-ink text-paper hover:bg-ink-soft active:bg-ink',
  secondary:
    'border border-ink text-ink hover:bg-ink hover:text-paper active:bg-ink-soft active:text-paper',
  secondaryOnDark:
    'border border-white text-white hover:bg-white hover:text-ink active:bg-paper active:text-ink',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-hover',
  ghost: 'text-ink hover:bg-ink/10 active:bg-ink/15',
  /** Destructive actions. Always paired with a clear text label, never colour alone. */
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-small',
  md: 'min-h-12 px-5 text-body',
  lg: 'min-h-14 px-7 text-body-lg',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonProps = SharedProps & { loading?: boolean } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >;

/** A real <button>. `loading` shows a spinner, disables the button and sets aria-busy. */
export function Button({
  variant,
  size,
  icon,
  className,
  children,
  loading = false,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? (
        <Loader2
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}

type ButtonLinkProps = SharedProps & {
  href: string;
  external?: boolean;
} & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'className' | 'children' | 'href'
  >;

/** Internal paths use next/link. Everything else (tel:, mailto:, https:) is a plain anchor. */
export function ButtonLink({
  variant,
  size,
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
      <span>{children}</span>
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
