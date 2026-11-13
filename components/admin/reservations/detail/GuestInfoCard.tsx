'use client';

import {
  Check,
  Copy,
  Globe,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react';
import { useState } from 'react';

import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/button';
import type { ReservationDetail } from '@/types/reservation.types';

/** Guest contact and request details for the reservation detail page. */
export function GuestInfoCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyToClipboard = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const rawPhone = reservation.guestPhone?.replace(/[^0-9]/g, '');

  return (
    <AdminCard title="Guest details">
      <div className="space-y-4">
        {/* Name & Country */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-body-lg font-semibold text-ink">
                {reservation.guestName}
              </p>
              {reservation.guestCountry && (
                <p className="flex items-center gap-1 text-caption text-muted-foreground">
                  <Globe className="size-3" aria-hidden="true" />
                  Country: {reservation.guestCountry}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Links & Actions */}
        <div className="grid gap-3 border-t border-line pt-2 sm:grid-cols-2">
          {/* Phone */}
          <div className="rounded-control border border-line bg-paper/50 p-2.5">
            <span className="text-caption font-semibold text-muted-foreground uppercase">
              Phone number
            </span>
            {reservation.guestPhone ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-small font-medium text-ink">
                  {reservation.guestPhone}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      copyToClipboard(reservation.guestPhone!, 'phone')
                    }
                    aria-label="Copy phone number"
                  >
                    {copiedPhone ? (
                      <Check
                        className="size-3.5 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>

                  <a
                    href={`tel:${reservation.guestPhone}`}
                    aria-label="Call guest phone"
                    className="rounded-control p-1 text-muted-foreground hover:text-ink"
                  >
                    <Phone className="size-3.5" aria-hidden="true" />
                  </a>

                  {rawPhone && (
                    <a
                      href={`https://wa.me/${rawPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Message guest on WhatsApp"
                      className="rounded-control p-1 text-whatsapp hover:brightness-110"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-caption text-muted-foreground italic">
                Redacted or not provided
              </p>
            )}
          </div>

          {/* Email */}
          <div className="rounded-control border border-line bg-paper/50 p-2.5">
            <span className="text-caption font-semibold text-muted-foreground uppercase">
              Email address
            </span>
            {reservation.guestEmail ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-small font-medium text-ink">
                  {reservation.guestEmail}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      copyToClipboard(reservation.guestEmail!, 'email')
                    }
                    aria-label="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check
                        className="size-3.5 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>

                  <a
                    href={`mailto:${reservation.guestEmail}`}
                    aria-label="Email guest"
                    className="rounded-control p-1 text-muted-foreground hover:text-ink"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-caption text-muted-foreground italic">
                Redacted or not provided
              </p>
            )}
          </div>
        </div>

        {/* Special Requests */}
        {reservation.specialRequests && (
          <div className="border-t border-line pt-2">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground uppercase">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              <span>Special requests</span>
            </div>
            <p className="mt-1 rounded-control bg-paper p-3 text-small text-ink">
              {reservation.specialRequests}
            </p>
          </div>
        )}

        {/* Internal Notes (Read-only for now) */}
        <div className="border-t border-line pt-2">
          <span className="text-caption font-semibold text-muted-foreground uppercase">
            Internal staff notes
          </span>
          <p className="mt-1 rounded-control border border-dashed border-line bg-paper/30 p-3 text-small text-muted-foreground italic">
            {reservation.notes || 'No internal notes recorded.'}
          </p>
        </div>
      </div>
    </AdminCard>
  );
}
