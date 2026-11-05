'use client';

import { MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { ButtonLink } from './ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';

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
  message,
  children,
}: HelpBlockProps) {
  const site = useSite();
  const whatsappMessage =
    message ??
    `Hello ${site.name}, I'm not sure which room suits us. Can you help?`;
  const buttons = (
    <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
      <ButtonLink
        href={whatsappHref(site, whatsappMessage)}
        external
        variant="whatsapp"
        icon={<MessageCircle className="size-5" aria-hidden />}
      >
        Chat on WhatsApp
      </ButtonLink>
      <ButtonLink
        href={telHref(site)}
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
      <Card
        render={<aside aria-labelledby="help-compact" />}
        className="h-full justify-center text-body"
      >
        <CardHeader>
          <CardTitle
            id="help-compact"
            render={<h2 />}
            className="font-display text-h3"
          >
            Not sure which room fits?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Tell us who is travelling and for how long, and we will suggest a
          room.
        </CardContent>
        <CardFooter className="border-0 bg-transparent pt-0">
          {buttons}
        </CardFooter>
      </Card>
    );
  }

  return (
    <section aria-labelledby="help-heading" className="section-y pb-0">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-8 rounded-card bg-card p-8 shadow-raised md:flex-row md:items-center md:p-10">
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
