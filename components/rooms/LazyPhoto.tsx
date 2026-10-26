'use client';

import { useEffect, useRef, useState } from 'react';

import { Photo } from '../ui/Photo';

interface LazyPhotoProps {
  src: string;
  alt: string;
  sizes: string;
}

/**
 * Mounts the image only once the slide scrolls into view. Slides that are clipped by the carousel
 * are not "intersecting", so only the first photo of a card loads up front.
 */
export function LazyPhoto({ src, alt, sizes }: LazyPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShow(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [show]);

  return (
    <div ref={ref} className="bg-ink/10 aspect-[4/3] w-full">
      {show && (
        <Photo src={src} alt={alt} sizes={sizes} className="h-full w-full" />
      )}
    </div>
  );
}
