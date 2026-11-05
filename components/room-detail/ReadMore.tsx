'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { textLinkRecipe } from '@/components/ui/text-link';
import { cn } from '@/lib/utils';

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
        className={`max-w-prose text-body-lg leading-prose text-ink/90 ${expanded ? '' : 'line-clamp-6'}`}
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
          className={cn(textLinkRecipe, 'mt-1 p-0')}
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  );
}
