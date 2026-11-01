'use client';

import { Pause, Play } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';

import { Button } from './ui/button';

interface HeroVideoProps {
  src: string;
  type: string;
}

type NetworkNavigator = Navigator & { connection?: { saveData?: boolean } };

const noSubscribe = () => () => {};

/** One-time capability probe. Client-only: the server snapshot keeps SSR out. */
function videoCapabilities() {
  const motionOk = window.matchMedia(
    '(prefers-reduced-motion: no-preference)',
  ).matches;
  const wide = window.matchMedia('(min-width: 768px)').matches;
  const saveData =
    (navigator as NetworkNavigator).connection?.saveData === true;
  return motionOk && wide && !saveData;
}

/**
 * Silent, looping background video. Only loads on tablet and up, with motion allowed and Data Saver off.
 * Always has a pause button (WCAG 2.2.2). The hero photo stays underneath as the poster.
 */
export function HeroVideo({ src, type }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const enabled = useSyncExternalStore(
    noSubscribe,
    videoCapabilities,
    () => false,
  );
  const [playing, setPlaying] = useState(true);

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
        className="absolute inset-0 z-1 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={src} type={type} />
      </video>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={toggle}
        aria-label={
          playing ? 'Pause background video' : 'Play background video'
        }
        className="bg-ink/70 hover:bg-ink absolute right-4 bottom-4 z-10 hidden size-11 rounded-full text-white transition-colors md:inline-flex"
      >
        {playing ? (
          <Pause className="size-5" aria-hidden />
        ) : (
          <Play className="size-5" aria-hidden />
        )}
      </Button>
    </>
  );
}
