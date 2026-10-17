"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /** How far the element travels against the scroll, in percent of its own height. Positive moves it down as you scroll past. */
  amount?: number;
}

/**
 * Translates its child on the Y axis as the page scrolls past it.
 * Keep the amount small (6–14) so it reads as depth, not motion.
 */
export function Parallax({ children, className, amount = 10 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Map scroll progress to a small translate, centred so the element rests at 0 mid-view.
  const y = useTransform(scrollYProgress, [0, 1], [`${-amount}%`, `${amount}%`]);

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
