import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';

import { site, telHref, whatsappHref } from '@/lib/site';

import { CookieSettingsButton } from './CookieSettingsButton';
import { Logo } from './Logo';

const link =
  'inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline';

export function Footer() {
  return (
    <footer className="on-dark bg-ink text-paper/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="text-paper">
          <Logo />
          <p className="mt-3 max-w-xs text-small text-paper/80">
            {site.description}
          </p>
          <ul aria-label="Social media" className="mt-4 flex gap-2">
            {site.social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  aria-label={s.label}
                  className="grid size-11 place-items-center rounded-full border border-paper/40 transition-colors hover:bg-paper hover:text-ink"
                >
                  {s.platform === 'instagram' ? (
                    <Instagram className="size-5" aria-hidden />
                  ) : (
                    <Facebook className="size-5" aria-hidden />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-h3 text-paper">Contact</h2>
          <ul className="mt-3 space-y-1 text-small">
            <li className="flex gap-3 py-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <address className="not-italic">
                {site.address.lines.join(', ')}
              </address>
            </li>
            <li>
              <a href={telHref()} className={link}>
                <Phone className="mr-3 size-4" aria-hidden />
                {site.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                <MessageCircle className="mr-3 size-4" aria-hidden />
                WhatsApp<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contact.email}`} className={link}>
                <Mail className="mr-3 size-4" aria-hidden />
                {site.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-h3 text-paper">Explore</h2>
          <ul className="mt-3 text-small">
            {site.nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Policies">
          <h2 className="font-display text-h3 text-paper">Policies</h2>
          <ul className="mt-3 text-small">
            {site.policies.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={link}>
                  {p.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton className={`${link} gap-2`} />
            </li>
          </ul>
        </nav>
      </div>

      {/* Extra bottom padding on mobile keeps the copyright clear of the sticky Book Now bar. */}
      <div className="border-t border-paper/15 pb-24 pt-6 md:pb-6">
        <p className="container-page text-small">
          &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
