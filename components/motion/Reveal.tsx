'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { fadeUp, viewportOnce } from './variants';

interface RevealProps {
  children: ReactNode;
  /** Class for the wrapper element (e.g. spacing utilities). */
  className?: string;
  /** Which HTML element to render. Defaults to div. */
  as?: 'div' | 'section' | 'li' | 'article' | 'figure';
  /** Override the default fade-up (e.g. pass scaleIn or blurIn). */
  variants?: typeof fadeUp;
  /** Delay before this reveal fires (seconds). */
  delay?: number;
}

/** Fades and lifts its children into place once, the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  as = 'div',
  variants = fadeUp,
  delay = 0,
}: RevealProps) {
  const reduced = useReducedMotion();
  const Comp = motion[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}
