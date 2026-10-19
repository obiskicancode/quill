'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { EASE_OUT } from './variants';

interface TextRevealProps {
  text: string;
  className?: string;
  /** Which heading element to render. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  /** Gap between each word's entrance, in seconds. */
  staggerChildren?: number;
  /** Delay before the first word starts, in seconds. */
  delayChildren?: number;
  /** Fires on scroll into view (default) instead of immediately on mount. */
  onScroll?: boolean;
  /** Accessible id to pair with aria-labelledby. */
  id?: string;
}

/**
 * Splits text into words, each revealed from behind a mask (translateY 100% -> 0).
 * The classic premium headline effect. Words wrap naturally; long words are not broken mid-word.
 */
export function TextReveal({
  text,
  className,
  as = 'p',
  staggerChildren = 0.05,
  delayChildren = 0,
  onScroll = true,
  id,
}: TextRevealProps) {
  const reduced = useReducedMotion();
  const Tag = as;

  if (reduced) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }

  const words = text.split(' ');

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren },
    },
  };

  const child = {
    hidden: { y: '100%' },
    visible: {
      y: '0%',
      transition: { duration: 0.7, ease: EASE_OUT },
    },
  };

  return (
    <Tag id={id} className={className}>
      <motion.span
        className="inline-block"
        variants={container}
        initial="hidden"
        {...(onScroll
          ? { whileInView: 'visible', viewport: { once: true, margin: '-10%' } }
          : { animate: 'visible' })}
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <motion.span className="inline-block" variants={child}>
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
