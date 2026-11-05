'use client';

import { Button } from '@/components/ui/button';
import { textLinkRecipe } from '@/components/ui/text-link';
import { cn } from '@/lib/utils';
import { useConsent } from '@/providers/consent.provider';

/** A small button to reopen cookie settings and change your choice. Reusable on light and dark backgrounds. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { reset } = useConsent();

  return (
    <Button
      type="button"
      variant="link"
      onClick={reset}
      className={className ?? cn(textLinkRecipe, 'gap-2 p-0 text-small')}
    >
      Cookie settings
    </Button>
  );
}
