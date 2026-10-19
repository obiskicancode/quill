'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { EASE_OUT } from '../motion/variants';

interface FlowDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** false while a request is running: Esc and the close button are disabled so an action cannot be abandoned half-way. */
  dismissible?: boolean;
  children: ReactNode;
}

/**
 * Modal on desktop, full-screen sheet on mobile. A native <dialog>: focus is trapped inside, Esc closes it,
 * and focus returns to the button that opened it. Content animates in and out via AnimatePresence; the dialog
 * itself stays open until the exit animation finishes, so it can be closed smoothly.
 */
export function FlowDialog({
  open,
  onClose,
  title,
  dismissible = true,
  children,
}: FlowDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      return;
    }
    // Reduced motion skips the exit animation, so close the dialog straight away.
    if (reduced && dialog.open) dialog.close();
  }, [open, reduced]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
      }}
      className="m-auto max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] rounded-card bg-paper p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-screen max-md:max-w-none max-md:rounded-none"
    >
      <AnimatePresence
        onExitComplete={() => {
          const dialog = ref.current;
          if (dialog?.open && !open) dialog.close();
        }}
      >
        {open && (
          <motion.div
            key="flow-dialog-content"
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.26, ease: EASE_OUT }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3 md:px-6">
              <h2 id={titleId} className="font-display text-h3">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={!dismissible}
                onClick={onClose}
                className="grid size-11 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-40"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
