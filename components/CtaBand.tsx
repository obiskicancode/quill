'use client';

import { MessageCircle } from 'lucide-react';

import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { Magnetic } from './motion/Magnetic';
import { Reveal } from './motion/Reveal';
import { TextReveal } from './motion/TextReveal';
import { ButtonLink } from './ui/button';

export function CtaBand() {
  const site = useSite();
  if (!site.cta.heading) return null;
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-primary py-14 text-ink md:py-20"
    >
      <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="max-w-xl">
          <TextReveal
            as="h2"
            id="cta-heading"
            text={site.cta.heading}
            className="font-display text-h2 text-balance"
            staggerChildren={0.05}
          />
          <Reveal delay={0.15}>
            <p className="mt-3 text-body-lg">{site.cta.text}</p>
          </Reveal>
        </div>
        <Reveal
          delay={0.2}
          className="flex w-full flex-col flex-wrap gap-3 sm:flex-row md:w-auto"
        >
          <Magnetic className="inline-flex w-full sm:w-auto">
            <span className="group relative inline-flex w-full overflow-hidden rounded-control">
              <ButtonLink
                href={site.bookingHref}
                variant="dark"
                size="lg"
                className="w-full"
              >
                Book Now
              </ButtonLink>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[500%] motion-reduce:hidden"
              />
            </span>
          </Magnetic>
          <Magnetic className="inline-flex w-full sm:w-auto">
            <ButtonLink
              href={whatsappHref(site)}
              external
              variant="secondary"
              size="lg"
              className="w-full"
              icon={<MessageCircle className="size-5" aria-hidden />}
            >
              Chat on WhatsApp
            </ButtonLink>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}
