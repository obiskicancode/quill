'use client';

import { useEffect, useState } from 'react';

import { useSite } from '@/providers/site.provider';

import { ButtonLink } from './ui/Button';

/**
 * Mobile-only Book Now bar. Hidden while the availability search is on screen (it would duplicate the main action).
 * On pages with no search bar it simply stays visible. Right padding leaves room for the WhatsApp button.
 */
export function StickyBookBar() {
  const site = useSite();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('availability-search');
    if (!target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time DOM probe after mount
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[5.5rem] pt-3 backdrop-blur transition-[transform,visibility] duration-200 md:hidden ${
        visible ? 'translate-y-0' : 'invisible translate-y-full'
      }`}
    >
      <ButtonLink href={site.bookingHref} size="lg" className="w-full">
        Book Now
      </ButtonLink>
    </div>
  );
}
