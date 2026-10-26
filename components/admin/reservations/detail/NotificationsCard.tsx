import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import type { ReservationNotificationLogItem } from '@/types/reservation.types';

export function NotificationsCard({
  notifications,
}: {
  notifications: ReservationNotificationLogItem[];
}) {
  return (
    <AdminCard
      title="Automated notifications"
      description="Email and WhatsApp delivery status."
    >
      {notifications.length === 0 ? (
        <AdminEmpty title="No notifications logged">
          No automated emails or WhatsApp messages have been logged for this
          reservation.
        </AdminEmpty>
      ) : (
        <div className="divide-line divide-y">
          {notifications.map((n) => {
            const isFailed = n.status === 'failed';
            return (
              <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted size-4" aria-hidden="true" />
                    <div>
                      <p className="text-small text-ink font-semibold">
                        {n.subject || n.templateKey || 'Automated update'}
                      </p>
                      <p className="text-caption text-muted">
                        To: {n.recipient} ({n.channel})
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-caption inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold capitalize ${
                      isFailed
                        ? 'border-danger/30 bg-danger/10 text-danger'
                        : 'border-success/30 bg-success/10 text-success'
                    }`}
                  >
                    {isFailed ? (
                      <AlertCircle className="size-3" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    )}
                    <span>{n.status}</span>
                  </span>
                </div>

                {isFailed && n.error && (
                  <p className="rounded-control bg-danger/5 text-caption text-danger mt-1.5 p-2">
                    Error: {n.error}
                  </p>
                )}

                <p className="text-caption text-muted/80 mt-1">
                  {new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(n.createdAt))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
