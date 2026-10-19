'use client';

import { useEffect, useId, useRef, useState } from 'react';

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
        className={`max-w-prose text-body-lg leading-[1.7] text-ink/90 ${expanded ? '' : 'line-clamp-6'}`}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-[6px]"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
