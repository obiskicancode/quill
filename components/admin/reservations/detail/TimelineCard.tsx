import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
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
      <div className="before:bg-line relative pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5">
        <div className="space-y-5">
          {history.map((item) => {
            const formattedTime = new Intl.DateTimeFormat('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(item.createdAt));

            return (
              <div key={item.id} className="relative">
                {/* Timeline node */}
                <span className="border-card bg-ink ring-line absolute top-1 -left-6 size-2.5 rounded-full border-2 ring-2" />

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.toStatus} />
                  <span className="text-caption text-ink font-semibold">
                    by {item.actorName}
                    {item.actorRole && ` (${item.actorRole})`}
                  </span>
                </div>

                {item.reason && (
                  <p className="text-small text-muted-foreground mt-1">
                    {item.reason}
                  </p>
                )}

                <p className="text-caption text-muted-foreground/75 mt-0.5">
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
