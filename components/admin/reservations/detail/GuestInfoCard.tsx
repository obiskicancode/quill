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
import type { ReservationDetail } from '@/types/reservation.types';

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
            <User className="text-muted size-4" aria-hidden="true" />
            <div>
              <p className="text-body-lg text-ink font-semibold">
                {reservation.guestName}
              </p>
              {reservation.guestCountry && (
                <p className="text-caption text-muted flex items-center gap-1">
                  <Globe className="size-3" aria-hidden="true" />
                  Country: {reservation.guestCountry}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Links & Actions */}
        <div className="border-line grid gap-3 border-t pt-2 sm:grid-cols-2">
          {/* Phone */}
          <div className="rounded-control border-line bg-paper/50 border p-2.5">
            <span className="text-caption text-muted font-semibold uppercase">
              Phone number
            </span>
            {reservation.guestPhone ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-small text-ink truncate font-medium">
                  {reservation.guestPhone}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(reservation.guestPhone!, 'phone')
                    }
                    aria-label="Copy phone number"
                    className="rounded-control text-muted hover:text-ink p-1"
                  >
                    {copiedPhone ? (
                      <Check
                        className="text-success size-3.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <a
                    href={`tel:${reservation.guestPhone}`}
                    aria-label="Call guest phone"
                    className="rounded-control text-muted hover:text-ink p-1"
                  >
                    <Phone className="size-3.5" aria-hidden="true" />
                  </a>

                  {rawPhone && (
                    <a
                      href={`https://wa.me/${rawPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Message guest on WhatsApp"
                      className="rounded-control text-whatsapp p-1 hover:brightness-110"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-caption text-muted mt-1 italic">
                Redacted or not provided
              </p>
            )}
          </div>

          {/* Email */}
          <div className="rounded-control border-line bg-paper/50 border p-2.5">
            <span className="text-caption text-muted font-semibold uppercase">
              Email address
            </span>
            {reservation.guestEmail ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-small text-ink truncate font-medium">
                  {reservation.guestEmail}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(reservation.guestEmail!, 'email')
                    }
                    aria-label="Copy email address"
                    className="rounded-control text-muted hover:text-ink p-1"
                  >
                    {copiedEmail ? (
                      <Check
                        className="text-success size-3.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <a
                    href={`mailto:${reservation.guestEmail}`}
                    aria-label="Email guest"
                    className="rounded-control text-muted hover:text-ink p-1"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-caption text-muted mt-1 italic">
                Redacted or not provided
              </p>
            )}
          </div>
        </div>

        {/* Special Requests */}
        {reservation.specialRequests && (
          <div className="border-line border-t pt-2">
            <div className="text-caption text-muted flex items-center gap-1.5 font-semibold uppercase">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              <span>Special requests</span>
            </div>
            <p className="rounded-control bg-paper text-small text-ink mt-1 p-3">
              {reservation.specialRequests}
            </p>
          </div>
        )}

        {/* Internal Notes (Read-only for now) */}
        <div className="border-line border-t pt-2">
          <span className="text-caption text-muted font-semibold uppercase">
            Internal staff notes
          </span>
          <p className="rounded-control border-line bg-paper/30 text-small text-muted mt-1 border border-dashed p-3 italic">
            {reservation.notes || 'No internal notes recorded.'}
          </p>
        </div>
      </div>
    </AdminCard>
  );
}
