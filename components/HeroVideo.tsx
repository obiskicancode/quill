'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface HeroVideoProps {
  src: string;
  type: string;
}

type NetworkNavigator = Navigator & { connection?: { saveData?: boolean } };

/**
 * Silent, looping background video. Only loads on tablet and up, with motion allowed and Data Saver off.
 * Always has a pause button (WCAG 2.2.2). The hero photo stays underneath as the poster.
 */
export function HeroVideo({ src, type }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const motionOk = window.matchMedia(
      '(prefers-reduced-motion: no-preference)',
    ).matches;
    const wide = window.matchMedia('(min-width: 768px)').matches;
    const saveData =
      (navigator as NetworkNavigator).connection?.saveData === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe after mount; must not run during SSR
    setEnabled(motionOk && wide && !saveData);
  }, []);

  if (!enabled) return null;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 z-[1] h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={src} type={type} />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={
          playing ? 'Pause background video' : 'Play background video'
        }
        className="absolute bottom-4 right-4 z-10 hidden size-11 place-items-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink md:grid"
      >
        {playing ? (
          <Pause className="size-5" aria-hidden />
        ) : (
          <Play className="size-5" aria-hidden />
        )}
      </button>
    </>
  );
}
