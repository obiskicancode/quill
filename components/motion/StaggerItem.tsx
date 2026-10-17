"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, scaleIn } from "./variants";

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "figure" | "p" | "span";
  /** Use the scale-in entrance instead of the default fade-up. */
  scale?: boolean;
  /** Extra delay on top of the parent's stagger (seconds). */
  delay?: number;
}

/** A child of a `<StaggerGroup>`. Animates when the parent enters view. */
export function StaggerItem({
  children,
  className,
  as = "div",
  scale = false,
  delay = 0,
}: StaggerItemProps) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  const variants = scale ? scaleIn : fadeUp;

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Comp
      className={className}
      variants={variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Comp>
  );
}
