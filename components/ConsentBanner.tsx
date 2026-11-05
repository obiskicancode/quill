'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Cookie } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';
import { useConsent } from '@/providers/consent.provider';

import { EASE_OUT } from './motion/variants';
import { Button } from './ui/button';

interface ConsentBannerProps {
  /** True only when the hotel has an analytics or marketing provider configured. */
  enabled: boolean;
  privacyHref: string;
}

/**
 * Non-blocking cookie banner. It never traps focus. It only appears when optional analytics is
 * configured and the visitor has not yet made a choice. Buttons are full width on small screens.
 */
export function ConsentBanner({ enabled, privacyHref }: ConsentBannerProps) {
  const { consent, grant, deny } = useConsent();
  const reduced = useReducedMotion();
  const show = enabled && consent === 'unknown';

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role="dialog"
          aria-labelledby="consent-title"
          aria-modal="false"
          className="fixed inset-x-0 bottom-(--bottom-bar-h) z-(--z-banner) border-t border-line bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised md:p-5 md:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: 16 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: EASE_OUT }}
        >
          <div className="container-page flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p
                id="consent-title"
                className="flex items-center gap-2 font-semibold"
              >
                <Cookie className="size-5" aria-hidden />
                We use cookies to help us improve your experience
              </p>
              <p className="mt-1 text-small text-ink/85">
                We only use optional cookies when analytics or marketing is
                configured. You can accept or reject them at any time. Read our{' '}
                <TextLink href={privacyHref}>Privacy Policy</TextLink>.
              </p>
            </div>
            <div className="flex w-full flex-col flex-wrap gap-2 sm:flex-row md:w-auto">
              <Button
                onClick={deny}
                variant="secondary"
                size="sm"
                className="w-full md:w-auto"
              >
                Reject
              </Button>
              <Button onClick={grant} size="sm" className="w-full md:w-auto">
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
