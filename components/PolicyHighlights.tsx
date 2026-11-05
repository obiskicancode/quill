import { CalendarClock, Lock, Undo2 } from 'lucide-react';

import { IconBadge } from '@/components/ui/icon-badge';
import { TextLink } from '@/components/ui/text-link';
import { getPolicySettings } from '@/lib/content/data';
import { formatGuestTime } from '@/lib/format';

export async function PolicyHighlights() {
  const policies = await getPolicySettings();
  const p = {
    checkIn: policies.houseRules.checkInTime,
    checkOut: policies.houseRules.checkOutTime,
    cancellation:
      policies.cancellation.freeCancellationHours === null
        ? 'This rate cannot be cancelled free of charge.'
        : `Free cancellation up to ${policies.cancellation.freeCancellationHours} hours before arrival.`,
    fullPoliciesHref: '/policies/cancellation-policy',
  };
  const items = [
    {
      icon: CalendarClock,
      title: 'Check-in and check-out',
      text: `Check-in from ${formatGuestTime(p.checkIn)}. Check-out by ${formatGuestTime(p.checkOut)}.`,
    },
    { icon: Undo2, title: 'Cancellation', text: p.cancellation },
    {
      icon: Lock,
      title: 'Pay securely online',
      text: 'Your payment is processed securely and your confirmation arrives straight away.',
    },
  ];
  return (
    <section aria-labelledby="policy-heading" className="section-y">
      <div className="container-page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 id="policy-heading" className="font-display text-h2">
            Good to know before you book
          </h2>
          <TextLink href={p.fullPoliciesHref}>Read the full policies</TextLink>
        </div>
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <IconBadge>
                <Icon />
              </IconBadge>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-small text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
