'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, MessageCircle, Phone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { EASE_OUT } from './motion/variants';
import { SiteLogo } from './SiteLogo';
import { Button, ButtonLink } from './ui/button';

/** Fixed header. Transparent over the hero on the home page, solid and compact once scrolled. */
export function Header() {
  const site = useSite();
  const pathname = usePathname();
  const overHero = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu on navigation
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const solid = scrolled || open || !overHero;
  const iconButton =
    'grid size-11 place-items-center rounded-full transition-colors hover:bg-current/10';

  return (
    <>
      {!overHero && <div aria-hidden className="h-16 lg:h-20" />}
      <header
        className={`fixed inset-x-0 top-0 transition-[background-color,box-shadow,z-index] duration-200 ${
          open ? 'z-[80]' : 'z-40'
        } ${
          solid
            ? 'bg-paper/95 text-ink shadow-raised backdrop-blur'
            : 'on-dark from-ink/70 bg-gradient-to-b to-transparent text-white'
        }`}
      >
        <div
          className={`container-page flex items-center justify-between gap-3 transition-[height] duration-200 ${scrolled ? 'h-16' : 'h-[4.5rem] lg:h-20'}`}
        >
          <SiteLogo site={site} />

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className="decoration-brand inline-flex min-h-11 items-center px-3 font-medium decoration-2 underline-offset-[10px] hover:underline aria-[current=page]:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={telHref(site)}
              className="hidden min-h-11 items-center gap-2 px-2 font-medium xl:inline-flex"
            >
              <Phone className="size-4" aria-hidden />
              {site.contact.phoneDisplay}
            </a>
            <a
              href={telHref(site)}
              aria-label={`Call reception on ${site.contact.phoneDisplay}`}
              className={`${iconButton} xl:hidden`}
            >
              <Phone className="size-5" aria-hidden />
            </a>
            <ButtonLink href={site.bookingHref} size="sm">
              Book Now
            </ButtonLink>
            <Button
              ref={toggleRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
              className={`${iconButton} lg:hidden`}
            >
              {open ? (
                <X className="size-6" aria-hidden />
              ) : (
                <Menu className="size-6" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-nav"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
            initial={reduced ? false : { opacity: 0, scale: 0.98, y: 10 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.985, y: 6 }}
            transition={{ duration: reduced ? 0 : 0.32, ease: EASE_OUT }}
            className="bg-paper/95 text-ink supports-[backdrop-filter]:bg-paper/90 fixed inset-0 z-[70] backdrop-blur lg:hidden"
          >
            <div className="flex h-full flex-col items-center justify-center px-6">
              <nav aria-label="Mobile" className="w-full">
                <ul className="flex flex-col items-center">
                  {site.nav.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={reduced ? false : { opacity: 0, y: 12 }}
                      animate={reduced ? undefined : { opacity: 1, y: 0 }}
                      transition={{
                        duration: reduced ? 0 : 0.3,
                        ease: EASE_OUT,
                        delay: reduced ? 0 : 0.06 + i * 0.05,
                      }}
                    >
                      <Link
                        href={item.href}
                        aria-current={
                          pathname === item.href ? 'page' : undefined
                        }
                        onClick={() => setOpen(false)}
                        className="decoration-brand aria-[current=page]:text-brand-ink block py-4 text-center text-xl font-medium tracking-tight decoration-2 underline-offset-[10px] transition-colors hover:opacity-80 aria-[current=page]:underline sm:text-2xl"
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.3,
                  ease: EASE_OUT,
                  delay: reduced ? 0 : 0.06 + site.nav.length * 0.05,
                }}
                className="mt-12 w-full max-w-sm"
              >
                <ButtonLink
                  href={whatsappHref(site)}
                  external
                  variant="secondary"
                  icon={<MessageCircle className="size-5" aria-hidden />}
                  className="w-full"
                >
                  Chat on WhatsApp
                </ButtonLink>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
