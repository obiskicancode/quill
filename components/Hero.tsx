'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { HeroVideo } from './HeroVideo';
import { TextReveal } from './motion/TextReveal';
import { EASE_OUT, fadeUp, stagger } from './motion/variants';
import { ButtonLink } from './ui/button';
import { Photo } from './ui/Photo';

/** Full-width hero. The photo is the poster for the optional video; a dark gradient keeps the text above 4.5:1 on any image. */
export function Hero() {
  const site = useSite();
  const { headline, subheadline, image, video } = site.hero;
  const reduced = useReducedMotion();

  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark bg-ink relative isolate flex min-h-[34rem] items-end overflow-hidden text-white md:min-h-[40rem] xl:min-h-[44rem]"
    >
      <motion.div
        className="absolute inset-0 z-0"
        initial={reduced ? false : { scale: 1.08 }}
        animate={reduced ? undefined : { scale: 1 }}
        transition={{ duration: 7, ease: EASE_OUT }}
      >
        <Photo
          src={image.src}
          alt={image.alt}
          sizes="100vw"
          priority
          className="h-full w-full"
        />
      </motion.div>
      {video && <HeroVideo src={video.src} type={video.type} />}
      <motion.div
        aria-hidden
        className="from-ink/90 via-ink/60 to-ink/50 absolute inset-0 z-[2] bg-gradient-to-t"
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
      />

      <motion.div
        className="container-page relative z-10 pt-32 pb-24 md:pb-32"
        variants={stagger(0.14, 0.9)}
        initial={reduced ? false : 'hidden'}
        animate={reduced ? undefined : 'visible'}
      >
        <TextReveal
          id="hero-heading"
          as="h1"
          text={headline}
          onScroll={false}
          delayChildren={0.15}
          staggerChildren={0.06}
          className="font-display text-display max-w-3xl text-balance"
        />
        <motion.p
          variants={fadeUp}
          className="text-body-lg mt-5 max-w-xl text-white/90"
        >
          {subheadline}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <ButtonLink href={site.bookingHref} size="lg">
            Book Now
          </ButtonLink>
          <ButtonLink
            href={whatsappHref(site)}
            external
            variant="secondaryOnDark"
            size="lg"
            icon={<MessageCircle className="size-5" aria-hidden />}
          >
            Chat on WhatsApp
          </ButtonLink>
        </motion.div>
      </motion.div>
    </section>
  );
}
