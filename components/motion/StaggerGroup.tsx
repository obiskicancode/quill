'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { stagger, viewportOnce } from './variants';

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  /** Gap between each child's entrance, in seconds. */
  staggerChildren?: number;
  /** Delay before the first child starts, in seconds. */
  delayChildren?: number;
  as?: 'div' | 'ul' | 'section' | 'dl' | 'ol';
}

/**
 * A container that staggers its direct children into view.
 * Each child should be wrapped in a `<StaggerItem>`.
 */
export function StaggerGroup({
  children,
  className,
  staggerChildren = 0.08,
  delayChildren = 0,
  as = 'div',
}: StaggerGroupProps) {
  const reduced = useReducedMotion();
  const Comp = motion[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Comp
      className={className}
      variants={stagger(staggerChildren, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </Comp>
  );
}
