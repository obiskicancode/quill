import Link from 'next/link';
import { Home, Lock, MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { site, telHref, whatsappHref } from '@/lib/site';

import { Logo } from '../Logo';

/** Simplified chrome so nothing pulls the guest away from paying. The global Header and Footer are hidden on /checkout. */
interface CheckoutShellProps {
  children: ReactNode;
  /** Text next to the lock icon. Checkout says "Secure checkout"; the confirmation page says "Your booking". */
  label?: string;
  /** Adds a "Back to home" link (icon only on small screens). */
  backToHome?: boolean;
}

export function CheckoutShell({
  children,
  label = 'Secure checkout',
  backToHome = false,
}: CheckoutShellProps) {
  const link =
    'inline-flex min-h-11 items-center gap-2 px-2 text-small font-medium underline-offset-4 hover:underline';
  return (
    <>
      <header className="checkout-chrome border-b border-line bg-paper">
        <div className="container-page flex min-h-16 items-center justify-between gap-4">
          <Logo />
          <p className="inline-flex items-center gap-2 text-small font-semibold">
            <Lock className="size-4 text-accent-ink" aria-hidden />
            {label}
          </p>
          <div className="flex items-center">
            <a
              href={telHref()}
              className={link}
              aria-label={`Call ${site.contact.phoneDisplay}`}
            >
              <Phone className="size-4" aria-hidden />
              <span className="hidden md:inline">
                {site.contact.phoneDisplay}
              </span>
            </a>
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
              aria-label="Chat on WhatsApp (opens in a new tab)"
            >
              <MessageCircle className="size-4" aria-hidden />
              <span className="hidden md:inline">WhatsApp</span>
            </a>
            {backToHome && (
              <Link href="/" className={link} aria-label="Back to home">
                <Home className="size-4" aria-hidden />
                <span className="hidden md:inline">Back to home</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="checkout-chrome border-t border-line bg-paper pb-28 pt-6 lg:pb-8">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-small text-muted">
          <p>
            &copy; {new Date().getFullYear()} {site.name}
          </p>
          <ul className="flex flex-wrap gap-x-4">
            {site.policies.map((p) => (
              <li key={p.href}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {p.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </>
  );
}
