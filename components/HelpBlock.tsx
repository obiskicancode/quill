import { MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { site, telHref, whatsappHref } from '@/lib/site';

import { ButtonLink } from './ui/Button';

/** "Not sure which room fits?" Full-width section by default; `compact` is a card that can fill a gap in the room grid. */
interface HelpBlockProps {
  variant?: 'section' | 'compact';
  title?: string;
  text?: string;
  /** Pre-filled WhatsApp message. */
  message?: string;
  /** Extra action shown after the call button (for example "Manage booking"). */
  children?: ReactNode;
}

export function HelpBlock({
  variant = 'section',
  title = 'Not sure which room fits?',
  text = 'Tell us who is travelling and for how long. We will suggest the right room and check the dates for you.',
  message = `Hello ${site.name}, I'm not sure which room suits us. Can you help?`,
  children,
}: HelpBlockProps) {
  const buttons = (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ButtonLink
        href={whatsappHref(message)}
        external
        variant="whatsapp"
        icon={<MessageCircle className="size-5" aria-hidden />}
      >
        Chat on WhatsApp
      </ButtonLink>
      <ButtonLink
        href={telHref()}
        variant="secondary"
        icon={<Phone className="size-5" aria-hidden />}
      >
        Call reception
      </ButtonLink>
      {children}
    </div>
  );

  if (variant === 'compact') {
    return (
      <aside
        aria-labelledby="help-compact"
        className="flex h-full flex-col justify-center rounded-card border border-line bg-surface p-6"
      >
        <h2 id="help-compact" className="font-display text-h3">
          Not sure which room fits?
        </h2>
        <p className="mb-6 mt-2 text-muted">
          Tell us who is travelling and for how long, and we will suggest a
          room.
        </p>
        {buttons}
      </aside>
    );
  }

  return (
    <section aria-labelledby="help-heading" className="section-y pb-0">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-8 rounded-card bg-surface p-8 shadow-raised md:flex-row md:items-center md:p-10">
          <div className="max-w-xl">
            <h2 id="help-heading" className="font-display text-h2">
              {title}
            </h2>
            <p className="mt-3 text-body-lg text-ink/85">{text}</p>
          </div>
          {buttons}
        </div>
      </div>
    </section>
  );
}
