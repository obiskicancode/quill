import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import type { ReservationAuditEntry } from '@/types/reservation.types';

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
        <div className="divide-line divide-y">
          {auditLogs.map((a) => (
            <div key={a.id} className="text-small py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-ink font-semibold capitalize">
                  {a.action.replace('_', ' ')}
                </span>
                <span className="text-caption text-muted-foreground">
                  {new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(a.createdAt))}
                </span>
              </div>

              <p className="text-caption text-muted-foreground mt-0.5">
                Actor: <strong className="text-ink">{a.actorName}</strong>
                {a.actorRole && ` (${a.actorRole})`}
              </p>

              {a.reason && (
                <p className="text-caption text-muted-foreground/90 mt-1 italic">
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
