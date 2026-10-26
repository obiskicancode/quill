'use client';

import './globals.css';

import { Figtree, Young_Serif } from 'next/font/google';
import { useEffect } from 'react';

import { ButtonLink } from '@/components/ui/button';

const display = Young_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NG" className={`${display.variable} ${bodyFont.variable}`}>
      <body>
        <main className="container-page section-y">
          <div className="max-w-xl">
            <h1 tabIndex={-1} id="gerr-title" className="font-display text-h2">
              Something went wrong
            </h1>
            <p className="text-body-lg text-ink/85 mt-3">
              We ran into a technical problem. Please try again in a few
              moments.
            </p>
            <div className="mt-8">
              <ButtonLink href="/">Back to home</ButtonLink>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
