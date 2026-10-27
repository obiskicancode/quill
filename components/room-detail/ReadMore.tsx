'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '../ui/button';

/** Clamps text to about six lines. The button only appears when the text is actually longer. */
export function ReadMore({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (el && !expanded)
        setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [expanded, text]);

  return (
    <div>
      <p
        id={id}
        ref={ref}
        className={`text-body-lg text-ink/90 max-w-prose leading-[1.7] ${expanded ? '' : 'line-clamp-6'}`}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <Button
          type="button"
          variant="link"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((e) => !e)}
          className="decoration-brand mt-1 inline-flex h-auto min-h-11 items-center p-0 font-semibold underline decoration-2 underline-offset-[0.375rem]"
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  );
}
