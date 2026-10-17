"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

/**
 * A `<ul>` whose direct children (each a keyed `motion.li` with `layout`) animate in
 * when they appear, glide to new positions when the order changes, and fade out when
 * removed. `initial={false}` keeps the first render visible for LCP and no-JS users —
 * only later additions (filter results, "load more") animate. Reduced-motion users get
 * a plain list.
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <ul className={className}>{children}</ul>;
  }

  return (
    <motion.ul className={className}>
      <AnimatePresence initial={false} mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.ul>
  );
}
