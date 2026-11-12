import { AdminCard } from '@/components/admin/AdminCard';
import {
  AdminStatusBadge,
  reservationTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { formatHotelDateTime } from '@/lib/format';
import type { ReservationStatusHistoryItem } from '@/types/reservation.types';

export function TimelineCard({
  history,
}: {
  history: ReservationStatusHistoryItem[];
}) {
  return (
    <AdminCard
      title="Status timeline"
      description="Audit trail of booking transitions and timestamps."
    >
      <div className="relative pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-line">
        <div className="space-y-5">
          {history.map((item) => {
            const formattedTime = formatHotelDateTime(item.createdAt);

            return (
              <div key={item.id} className="relative">
                {/* Timeline node */}
                <span className="absolute top-1 -left-6 size-2.5 rounded-full border-2 border-card bg-ink ring-2 ring-line" />

                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone={reservationTone(item.toStatus)}>
                    {statusLabel(item.toStatus)}
                  </AdminStatusBadge>
                  <span className="text-caption font-semibold text-ink">
                    by {item.actorName}
                    {item.actorRole && ` (${item.actorRole})`}
                  </span>
                </div>

                {item.reason && (
                  <p className="mt-1 text-small text-muted-foreground">
                    {item.reason}
                  </p>
                )}

                <p className="mt-0.5 text-caption text-muted-foreground/75">
                  {formattedTime}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AdminCard>
  );
}
