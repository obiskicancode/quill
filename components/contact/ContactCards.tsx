import { Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { StaggerGroup, StaggerItem } from '@/components/motion';
import { CopyButton } from '@/components/ui/copy-button';
import { textLinkRecipe } from '@/components/ui/text-link';
import { getContactInfo } from '@/lib/content/data';
import { cn } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

function ContactCard({
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
    <StaggerItem as="li" scale className="flex">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle
            render={<h3 />}
            className="flex items-center gap-2 text-small font-semibold text-muted-foreground"
          >
            <span className="text-brand-ink">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grow text-body font-semibold wrap-break-word">
          {children}
        </CardContent>
        {copy && (
          <CardFooter className="border-0 bg-transparent">
            <CopyButton value={copy.value} label={copy.label} size="default" />
          </CardFooter>
        )}
      </Card>
    </StaggerItem>
  );
}

const link = cn(textLinkRecipe, 'inline-flex min-h-11 items-center');

/** Call (every public number), WhatsApp, email and reception hours. Each card has a copy action. Cards with no data are left out. */
export async function ContactCards() {
  const s = await getContactInfo();
  const cards: ReactNode[] = [];

  for (const p of s.publicPhones) {
    cards.push(
      <ContactCard
        key={p.tel}
        icon={<Phone className="size-4" aria-hidden />}
        title={p.label}
        copy={{ value: p.display, label: `${p.label.toLowerCase()} number` }}
      >
        <a href={`tel:${p.tel}`} className={link}>
          {p.display}
        </a>
      </ContactCard>,
    );
  }
  if (s.whatsappNumber) {
    cards.push(
      <ContactCard
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
      </ContactCard>,
    );
  }
  if (s.publicEmail) {
    cards.push(
      <ContactCard
        key="mail"
        icon={<Mail className="size-4" aria-hidden />}
        title="Email"
        copy={{ value: s.publicEmail, label: 'email address' }}
      >
        <a href={`mailto:${s.publicEmail}`} className={link}>
          {s.publicEmail}
        </a>
      </ContactCard>,
    );
  }
  if (s.receptionHours) {
    cards.push(
      <ContactCard
        key="hours"
        icon={<Clock className="size-4" aria-hidden />}
        title="Reception hours"
        copy={{ value: s.receptionHours, label: 'reception hours' }}
      >
        {s.receptionHours}
      </ContactCard>,
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
