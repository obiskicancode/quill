import { CalendarClock, Lock, Undo2 } from 'lucide-react';

import { policyHighlights } from '@/lib/rooms';

import { TextLink } from './ui/TextLink';

export function PolicyHighlights() {
  const p = policyHighlights;
  const items = [
    {
      icon: CalendarClock,
      title: 'Check-in and check-out',
      text: `Check-in from ${p.checkIn}. Check-out by ${p.checkOut}.`,
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
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-ink">
                <Icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-small text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
