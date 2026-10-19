'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { springGentle } from '../motion/variants';
import { SearchBar } from '../SearchBar';
import { TrustStrip } from '../TrustStrip';

/** The availability block that overlaps the hero. Springs up once the hero reveal settles. */
export function HomeSearch() {
  const reduced = useReducedMotion();
  const delay = reduced ? 0 : 0.9;

  return (
    <section
      aria-label="Check availability"
      className="relative z-20 -mt-10 md:-mt-12"
    >
      <div className="container-page">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 44 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay }}
        >
          <SearchBar />
        </motion.div>
        <TrustStrip revealDelay={delay} />
      </div>
    </section>
  );
}
