'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface TiltProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. Keep it small (4–8) so it feels premium, not gimmicky. */
  max?: number;
}

/**
 * Applies a subtle 3D tilt to its child following the cursor.
 * Desktop pointers only; touch and reduced-motion users get the static element.
 * The wrapper sets the perspective; the child rotates.
 */
export function Tilt({ children, className, max = 6 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 200,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 200,
    damping: 22,
  });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const onMouseLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={{ perspective: 900 }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
