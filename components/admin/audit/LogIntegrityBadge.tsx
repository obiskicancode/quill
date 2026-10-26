'use client';

import { ShieldCheck } from 'lucide-react';

export function LogIntegrityBadge() {
  return (
    <div className="border-line bg-paper/60 text-caption text-muted flex items-center gap-2 rounded-lg border px-3 py-2">
      <ShieldCheck className="text-success size-4 shrink-0" />
      <div>
        <span className="text-ink font-semibold">Database Log Integrity:</span>{' '}
        Audit log entries are immutable. PostgreSQL triggers and role privilege
        revocations enforce strict append-only retention. Modifications and
        deletions are permanently rejected at the database engine level.
      </div>
    </div>
  );
}
