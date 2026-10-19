'use client';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface PhotoProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Load straight away without a preload hint (first row of a grid). */
  eager?: boolean;
  /** Tiny blurred preview (a data URL) shown while the photo loads. */
  blurDataURL?: string | null;
  /** Dominant colour shown behind the photo while it loads. */
  placeholderColor?: string | null;
  /** Give the wrapper a fixed size or aspect ratio (e.g. "aspect-[4/3] w-full"). This is what prevents layout shift. */
  className?: string;
}

/**
 * next/image inside a fixed-ratio box. Shows a skeleton while loading and a calm
 * placeholder if the file is missing, so the page never shows a broken-image icon.
 */
export function Photo({
  src,
  alt,
  sizes,
  priority = false,
  eager = false,
  blurDataURL = null,
  placeholderColor = null,
  className = '',
}: PhotoProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  return (
    <div
      className={`relative overflow-hidden bg-ink/10 ${className}`}
      style={
        placeholderColor ? { backgroundColor: placeholderColor } : undefined
      }
    >
      {status === 'error' ? (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink/15 to-ink/5 px-4 text-center text-ink/60"
        >
          <ImageIcon className="size-8" aria-hidden />
          <span className="text-caption">Photo coming soon</span>
        </div>
      ) : (
        <>
          {status === 'loading' && (
            <div
              aria-hidden
              className="absolute inset-0 animate-pulse bg-ink/5"
            />
          )}
          <Image
            ref={(el) => {
              // Handles images that finished (or failed) before hydration, when onLoad/onError would be missed.
              if (el?.complete)
                setStatus((s) =>
                  s === 'loading'
                    ? el.naturalWidth > 0
                      ? 'ready'
                      : 'error'
                    : s,
                );
            }}
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            loading={!priority && eager ? 'eager' : undefined}
            placeholder={blurDataURL ? 'blur' : 'empty'}
            blurDataURL={blurDataURL ?? undefined}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className="object-cover"
          />
        </>
      )}
    </div>
  );
}
