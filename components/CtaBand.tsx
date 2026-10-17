"use client";

import { MessageCircle } from "lucide-react";
import { site, whatsappHref } from "@/lib/site";
import { Magnetic } from "./motion/Magnetic";
import { Reveal } from "./motion/Reveal";
import { TextReveal } from "./motion/TextReveal";
import { ButtonLink } from "./ui/Button";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="bg-accent py-14 text-ink md:py-20">
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
        <Reveal delay={0.2} className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <Magnetic className="inline-flex w-full sm:w-auto">
            <span className="group relative inline-flex w-full overflow-hidden rounded-control">
              <ButtonLink href={site.bookingHref} variant="dark" size="lg" className="w-full">
                Book Now
              </ButtonLink>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[500%] motion-reduce:hidden"
              />
            </span>
          </Magnetic>
          <Magnetic className="inline-flex w-full sm:w-auto">
            <ButtonLink
              href={whatsappHref()}
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
