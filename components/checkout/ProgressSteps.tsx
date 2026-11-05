'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface StepInfo {
  id: string;
  label: string;
  state: 'complete' | 'current' | 'upcoming';
  /** A step with nothing the guest has to do; it is only ticked if they use it. */
  optional?: boolean;
}

/** Anchors to each step on the same page. The current step carries aria-current="step". */
export function ProgressSteps({ steps }: { steps: StepInfo[] }) {
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((s, i) => (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-3">
            <a
              href={`#step-${s.id}`}
              aria-current={s.state === 'current' ? 'step' : undefined}
              className="flex min-h-11 min-w-0 items-center gap-2"
            >
              <span
                className={`grid size-8 shrink-0 place-items-center overflow-hidden rounded-full text-small font-semibold transition-colors duration-300 motion-reduce:transition-none ${
                  s.state === 'complete'
                    ? 'bg-ink text-paper'
                    : s.state === 'current'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-ink/50 text-muted-foreground'
                }`}
              >
                {reduced ? (
                  s.state === 'complete' ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    i + 1
                  )
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    {s.state === 'complete' ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check className="size-4" aria-hidden />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="num"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                )}
              </span>
              <span
                className={`truncate text-small ${s.state === 'upcoming' ? 'text-muted-foreground' : 'font-semibold'}`}
              >
                {s.label}
                {s.state === 'complete' && (
                  <span className="sr-only"> (completed)</span>
                )}
                {s.optional && s.state !== 'complete' && (
                  <span className="sr-only"> (optional)</span>
                )}
              </span>
            </a>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`h-px flex-1 transition-colors duration-300 motion-reduce:transition-none ${s.state === 'complete' ? 'bg-ink/40' : 'bg-line'}`}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
