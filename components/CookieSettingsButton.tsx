'use client';

import { Button } from '@/components/ui/button';
import { useConsent } from '@/providers/consent.provider';

/** A small button to reopen cookie settings and change your choice. Reusable on light and dark backgrounds. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { reset } = useConsent();

  return (
    <Button
      type="button"
      variant="link"
      onClick={reset}
      className={
        className ??
        'text-small inline-flex min-h-11 items-center gap-2 p-0 font-semibold underline-offset-4 hover:underline'
      }
    >
      Cookie settings
    </Button>
  );
}
