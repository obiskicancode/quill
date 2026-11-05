'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';

import { Button } from './button';

/**
 * Copies one value and says out loud which one landed on the clipboard, so the
 * announcement is not read as a bare "Copied." with no referent.
 */
export function CopyButton({
  value,
  label,
  size = 'sm',
}: {
  value: string;
  label: string;
  size?: 'sm' | 'default';
}) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={size}
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="shrink-0 gap-1.5 px-3 font-semibold"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? SUCCESS_MESSAGES.COPIED : 'Copy'}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied` : ''}
      </span>
    </>
  );
}
