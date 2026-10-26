import { MessageCircle, Phone } from 'lucide-react';

import { getPublicSite } from '@/lib/content/data';
import type { ISODate } from '@/lib/dates';
import { formatRange } from '@/lib/rooms';
import { telHref, whatsappHref } from '@/lib/site';

import { Reveal } from '../motion/Reveal';
import { ButtonLink } from '../ui/Button';

export async function AskCard({
  roomName,
  checkIn,
  checkOut,
}: {
  roomName: string;
  checkIn: ISODate | null;
  checkOut: ISODate | null;
}) {
  const site = await getPublicSite();
  const dates =
    checkIn && checkOut ? ` for ${formatRange(checkIn, checkOut)}` : '';
  const message = `Hello ${site.name}, I have a question about the ${roomName}${dates}.`;
  return (
    <section
      aria-labelledby="ask-title"
      className="rounded-card bg-surface shadow-raised p-6 md:p-8"
    >
      <Reveal>
        <h2 id="ask-title" className="font-display text-h3">
          Ask about this room
        </h2>
        <p className="text-ink/85 mt-2 max-w-prose">
          Questions about the bed, the view or a special request? We reply
          quickly on WhatsApp.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={whatsappHref(site, message)}
            external
            variant="secondary"
            icon={<MessageCircle className="size-5" aria-hidden />}
          >
            Ask on WhatsApp
          </ButtonLink>
          <ButtonLink
            href={telHref(site)}
            variant="secondary"
            icon={<Phone className="size-5" aria-hidden />}
          >
            Call reception
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
