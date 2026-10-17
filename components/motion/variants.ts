import type { Variants } from "framer-motion";

/** Signature ease used across the site: slow out, gentle settle. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Slightly snappier ease for micro-interactions. */
export const EASE_QUICK: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Fade up from a short distance. The workhorse reveal. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

/** Same idea, lighter travel — for small UI pieces. */
export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

/** Scale-in with a touch of upward drift — cards and tiles. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
};

/** Pure fade — for backdrop layers and overlays. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

/** Blur-to-sharp — for large quotes and display text. */
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

/** Blur-to-sharp container that also staggers its children in. Pair children with fadeUp. */
export const blurStagger: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: EASE_OUT,
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

/** Stagger container: pair with any of the item variants above. */
export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

/** Standard viewport config so reveals fire once, slightly before fully in view. */
export const viewportOnce = {
  once: true,
  margin: "-12% 0px -12% 0px",
} as const;

/** Spring config for interactive pieces (buttons, hover states). */
export const spring = { type: "spring", stiffness: 320, damping: 24 } as const;
export const springGentle = { type: "spring", stiffness: 180, damping: 26 } as const;
