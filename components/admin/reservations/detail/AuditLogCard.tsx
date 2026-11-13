import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { formatHotelDateTime } from '@/lib/format';
import type { ReservationAuditEntry } from '@/types/reservation.types';

/** Reservation audit entries with actor, action and change details. */
export function AuditLogCard({
  auditLogs,
}: {
  auditLogs: ReservationAuditEntry[] | null;
}) {
  if (!auditLogs) return null;

  return (
    <AdminCard
      title="Audit trail"
      description="Administrative actions and staff activity records."
    >
      {auditLogs.length === 0 ? (
        <AdminEmpty title="No audit entries">
          No staff actions have been logged on this booking yet.
        </AdminEmpty>
      ) : (
        <div className="divide-y divide-line">
          {auditLogs.map((a) => (
            <div key={a.id} className="py-2.5 text-small first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink capitalize">
                  {a.action.replace('_', ' ')}
                </span>
                <span className="text-caption text-muted-foreground">
                  {formatHotelDateTime(a.createdAt)}
                </span>
              </div>

              <p className="mt-0.5 text-caption text-muted-foreground">
                Actor: <strong className="text-ink">{a.actorName}</strong>
                {a.actorRole && ` (${a.actorRole})`}
              </p>

              {a.reason && (
                <p className="mt-1 text-caption text-muted-foreground/90 italic">
                  &ldquo;{a.reason}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}
