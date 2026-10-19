import { Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { StaggerGroup, StaggerItem } from '@/components/motion';
import { getContactInfo } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';

import { CopyButton } from '../checkout/PaymentStep';

function Card({
  icon,
  title,
  children,
  copy,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  copy?: { value: string; label: string };
}) {
  return (
    <StaggerItem
      as="li"
      scale
      className="flex flex-col justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-raised"
    >
      <div>
        <p className="flex items-center gap-2 text-small font-semibold text-muted">
          <span className="text-accent-ink">{icon}</span>
          {title}
        </p>
        <div className="mt-2 break-words font-semibold">{children}</div>
      </div>
      {copy && (
        <div>
          <CopyButton value={copy.value} label={copy.label} />
        </div>
      )}
    </StaggerItem>
  );
}

const link =
  'inline-flex min-h-11 items-center underline decoration-accent decoration-2 underline-offset-4';

/** Call (every public number), WhatsApp, email and reception hours. Each card has a copy action. Cards with no data are left out. */
export async function ContactCards({ flags }: { flags: PreviewFlags }) {
  const s = await getContactInfo(flags);
  const cards: ReactNode[] = [];

  for (const p of s.publicPhones) {
    cards.push(
      <Card
        key={p.tel}
        icon={<Phone className="size-4" aria-hidden />}
        title={p.label}
        copy={{ value: p.display, label: `${p.label.toLowerCase()} number` }}
      >
        <a href={`tel:${p.tel}`} className={link}>
          {p.display}
        </a>
      </Card>,
    );
  }
  if (s.whatsappNumber) {
    cards.push(
      <Card
        key="wa"
        icon={<MessageCircle className="size-4" aria-hidden />}
        title="WhatsApp"
        copy={{ value: `+${s.whatsappNumber}`, label: 'WhatsApp number' }}
      >
        <a
          href={`https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(s.whatsappPrefillMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Card>,
    );
  }
  if (s.publicEmail) {
    cards.push(
      <Card
        key="mail"
        icon={<Mail className="size-4" aria-hidden />}
        title="Email"
        copy={{ value: s.publicEmail, label: 'email address' }}
      >
        <a href={`mailto:${s.publicEmail}`} className={link}>
          {s.publicEmail}
        </a>
      </Card>,
    );
  }
  if (s.receptionHours) {
    cards.push(
      <Card
        key="hours"
        icon={<Clock className="size-4" aria-hidden />}
        title="Reception hours"
        copy={{ value: s.receptionHours, label: 'reception hours' }}
      >
        {s.receptionHours}
      </Card>,
    );
  }
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="cards-title" className="section-y pb-0">
      <div className="container-page">
        <h2 id="cards-title" className="sr-only">
          Ways to reach us
        </h2>
        <StaggerGroup
          as="ul"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {cards}
        </StaggerGroup>
      </div>
    </section>
  );
}
