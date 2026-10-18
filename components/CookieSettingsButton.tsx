"use client";

import { useConsent } from "@/lib/consent";

/** A small button to reopen cookie settings and change your choice. Reusable on light and dark backgrounds. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { reset } = useConsent();

  return (
    <button
      type="button"
      onClick={reset}
      className={
        className ??
        "inline-flex min-h-11 items-center gap-2 text-small font-semibold underline-offset-4 hover:underline"
      }
    >
      Cookie settings
    </button>
  );
}
