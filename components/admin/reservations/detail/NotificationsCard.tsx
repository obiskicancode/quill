import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { Badge } from '@/components/ui/badge';
import { formatHotelDateTime } from '@/lib/format';
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
        <div className="divide-y divide-line">
          {notifications.map((n) => {
            const isFailed = n.status === 'failed';
            return (
              <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-small font-semibold text-ink">
                        {n.subject || n.templateKey || 'Automated update'}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        To: {n.recipient} ({n.channel})
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={isFailed ? 'destructive' : 'success'}
                    className="capitalize"
                  >
                    {isFailed ? (
                      <AlertCircle aria-hidden="true" />
                    ) : (
                      <CheckCircle2 aria-hidden="true" />
                    )}
                    <span>{n.status}</span>
                  </Badge>
                </div>

                {isFailed && n.error && (
                  <p className="mt-1.5 rounded-control bg-destructive/5 p-2 text-caption text-destructive">
                    Error: {n.error}
                  </p>
                )}

                <p className="mt-1 text-caption text-muted-foreground/80">
                  {formatHotelDateTime(n.createdAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
