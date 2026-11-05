'use client';

import { useEffect, useState } from 'react';

import { MobileActionBar } from '@/components/ui/mobile-action-bar';
import { AVAILABILITY_SEARCH_ID } from '@/constants/content';
import { useSite } from '@/providers/site.provider';

import { ButtonLink } from './ui/button';

/**
 * Mobile-only Book Now bar. Hidden while the availability search is on screen (it would duplicate the main action).
 * On pages with no search bar it simply stays visible. Right padding leaves room for the WhatsApp button.
 */
export function StickyBookBar() {
  const site = useSite();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(AVAILABILITY_SEARCH_ID);
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
    <MobileActionBar until="md" collapsed={!visible}>
      <ButtonLink href={site.bookingHref} className="w-full">
        Book Now
      </ButtonLink>
    </MobileActionBar>
  );
}
