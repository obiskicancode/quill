'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, MessageCircle, Phone, X } from 'lucide-react'
import { site, telHref, whatsappHref } from '@/lib/site'
import { EASE_OUT } from './motion/variants'
import { Logo } from './Logo'
import { ButtonLink } from './ui/Button'

/** Fixed header. Transparent over the hero on the home page, solid and compact once scrolled. */
export function Header() {
  const pathname = usePathname()
  const overHero = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const solid = scrolled || open || !overHero
  const iconButton = 'grid size-11 place-items-center rounded-full transition-colors hover:bg-current/10'

  return (
    <>
      {!overHero && <div aria-hidden className="h-16 lg:h-20" />}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-200 ${
          solid ? 'bg-paper/95 text-ink shadow-raised backdrop-blur' : 'on-dark bg-gradient-to-b from-ink/70 to-transparent text-white'
        }`}
      >
        <div className={`container-page flex items-center justify-between gap-3 transition-[height] duration-200 ${scrolled ? 'h-16' : 'h-[4.5rem] lg:h-20'}`}>
          <Logo />

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className="inline-flex min-h-11 items-center px-3 font-medium decoration-accent decoration-2 underline-offset-[10px] hover:underline aria-[current=page]:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <a href={telHref()} className="hidden min-h-11 items-center gap-2 px-2 font-medium xl:inline-flex">
              <Phone className="size-4" aria-hidden />
              {site.contact.phoneDisplay}
            </a>
            <a href={telHref()} aria-label={`Call reception on ${site.contact.phoneDisplay}`} className={`${iconButton} xl:hidden`}>
              <Phone className="size-5" aria-hidden />
            </a>
            <ButtonLink href={site.bookingHref} size="sm">
              Book Now
            </ButtonLink>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
              className={`${iconButton} lg:hidden`}
            >
              {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="mobile-nav"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={reduced ? undefined : { opacity: 1, height: 'auto' }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.28, ease: EASE_OUT }}
              className="overflow-hidden border-t border-line bg-paper text-ink lg:hidden"
            >
              <nav aria-label="Mobile" className="container-page py-2">
                <ul>
                  {site.nav.map((item) => (
                    <li key={item.href} className="border-b border-line last:border-0">
                      <Link
                        href={item.href}
                        aria-current={pathname === item.href ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className="flex min-h-12 items-center text-body-lg font-medium aria-[current=page]:text-accent-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="container-page pb-5">
                <ButtonLink href={whatsappHref()} external variant="secondary" icon={<MessageCircle className="size-5" aria-hidden />} className="w-full">
                  Chat on WhatsApp
                </ButtonLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
