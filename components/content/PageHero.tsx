'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { Breadcrumb, type Crumb } from '../Breadcrumb';
import { TextReveal } from '../motion/TextReveal';
import { EASE_OUT, fadeUp, stagger } from '../motion/variants';
import { Photo } from '../ui/Photo';

interface PageHeroProps {
  crumbs: Crumb[];
  title: string;
  intro: string;
  image: { src: string; alt: string };
}

/**
 * Shared page opening: breadcrumb, H1, one-line intro and a compact image hero. The image is the page's LCP.
 * The image gets a slow zoom (scale only, never opacity, so the LCP paints immediately); the copy reveals
 * from behind a mask like the home hero.
 */
export function PageHero({ crumbs, title, intro, image }: PageHeroProps) {
  const reduced = useReducedMotion();

  return (
    <section
      aria-labelledby="page-title"
      className="on-dark relative isolate flex min-h-[15rem] items-end overflow-hidden bg-ink text-white md:min-h-[19rem]"
    >
      <motion.div
        className="absolute inset-0 z-0"
        initial={reduced ? false : { scale: 1.06 }}
        animate={reduced ? undefined : { scale: 1 }}
        transition={{ duration: 7, ease: EASE_OUT }}
      >
        <Photo
          src={image.src}
          alt=""
          sizes="100vw"
          priority
          className="h-full w-full"
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-0 z-[1] bg-gradient-to-t from-ink/90 via-ink/65 to-ink/55"
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      />
      <motion.div
        className="container-page relative z-10 py-8 md:py-12"
        variants={stagger(0.12, 0.1)}
        initial={reduced ? false : 'hidden'}
        animate={reduced ? undefined : 'visible'}
      >
        <motion.div variants={fadeUp}>
          <Breadcrumb tone="dark" items={crumbs} />
        </motion.div>
        <TextReveal
          id="page-title"
          as="h1"
          text={title}
          onScroll={false}
          staggerChildren={0.05}
          delayChildren={0.1}
          className="mt-2 max-w-3xl text-balance font-display text-h2 md:text-display"
        />
        <motion.p
          variants={fadeUp}
          className="mt-3 max-w-xl text-body-lg text-white/90"
        >
          {intro}
        </motion.p>
      </motion.div>
    </section>
  );
}
